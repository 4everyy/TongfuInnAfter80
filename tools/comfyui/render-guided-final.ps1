param(
    [string]$GuidePath = "$PSScriptRoot\guides\tongfu-inn-hall-guide.png",
    [string]$Prompt = 'high quality 2d game background, Chinese animated film interior, clean hand-drawn linework, crisp cel-painted edges, eye-level orthographic side view of a warm ancient inn hall, horizontal side-scrolling scene, exposed wooden beams, counter, round tables, staircase, paper windows, detailed wood grain, muted warm wood, jade green and restrained cinnabar accents, readable architecture, clear empty walking lane at bottom, sharp focus, no people, no text',
    [string]$NegativePrompt = 'exterior, outdoor, building facade, roof view, aerial view, top-down view, isometric, photo, photorealistic, 3d render, neon, oversaturated, bloom, blur, soft focus, depth of field, watercolor wash, dark horror, watermark, logo, text, people, malformed architecture, distorted perspective',
    [int]$Seed = 20260713,
    [string]$OutputPrefix = 'tongfu_guided_final'
)

$ErrorActionPreference = 'Stop'
$server = 'http://127.0.0.1:8188'
$inputDirectory = 'D:\AI\ComfyUI\app\input'
$workflowPath = Join-Path $PSScriptRoot 'workflows\tongfu-guided-final-api.json'

if (-not (Test-Path -LiteralPath $GuidePath)) {
    throw "Guide image not found: $GuidePath"
}

New-Item -ItemType Directory -Force -Path $inputDirectory | Out-Null
$guideName = [IO.Path]::GetFileName($GuidePath)
Copy-Item -LiteralPath $GuidePath -Destination (Join-Path $inputDirectory $guideName) -Force

$workflow = Get-Content -LiteralPath $workflowPath -Raw | ConvertFrom-Json
$workflow.'13'.inputs.image = $guideName
$workflow.'3'.inputs.seed = $Seed
$workflow.'11'.inputs.seed = $Seed
$workflow.'6'.inputs.text = $Prompt
$workflow.'7'.inputs.text = $NegativePrompt
$workflow.'9'.inputs.filename_prefix = $OutputPrefix

$body = @{ prompt = $workflow } | ConvertTo-Json -Depth 20
$queued = Invoke-RestMethod -Uri "$server/prompt" -Method Post -ContentType 'application/json' -Body $body
$promptId = $queued.prompt_id
Write-Host "Queued guided local final: $promptId"

for ($attempt = 0; $attempt -lt 360; $attempt++) {
    Start-Sleep -Seconds 2
    $history = Invoke-RestMethod -Uri "$server/history/$promptId" -TimeoutSec 10
    $entry = $history.PSObject.Properties[$promptId].Value
    if ($entry) {
        if ($entry.status.status_str -eq 'error') {
            throw "Generation failed. Check D:\AI\ComfyUI\logs\stderr.log"
        }
        $images = $entry.outputs.'9'.images
        if ($images) {
            foreach ($image in $images) {
                $relative = if ($image.subfolder) { Join-Path $image.subfolder $image.filename } else { $image.filename }
                Write-Host (Join-Path 'D:\AI\ComfyUI\app\output' $relative)
            }
            exit 0
        }
    }
}

throw 'Guided local final generation timed out after twelve minutes.'
