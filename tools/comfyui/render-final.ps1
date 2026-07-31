param(
    [string]$Prompt = 'hand-painted Chinese animation background, warm wooden inn hall, side-scrolling game scene, layered depth, jade green and cinnabar accents, expressive brushwork, clean silhouettes, clear lower walking lane, no people, no text',
    [string]$NegativePrompt = 'photo, photorealistic, modern furniture, 3d render, dark horror, watermark, logo, text, blurry, low quality, malformed architecture, distorted perspective, oversaturated',
    [int]$Seed = 20260713,
    [int]$BaseWidth = 512,
    [int]$BaseHeight = 320,
    [int]$OutputWidth = 1024,
    [int]$OutputHeight = 640,
    [string]$OutputPrefix = 'tongfu_final'
)

$ErrorActionPreference = 'Stop'
$server = 'http://127.0.0.1:8188'
$workflowPath = Join-Path $PSScriptRoot 'workflows\tongfu-final-local-api.json'
$workflow = Get-Content -LiteralPath $workflowPath -Raw | ConvertFrom-Json

$workflow.'3'.inputs.seed = $Seed
$workflow.'5'.inputs.width = $BaseWidth
$workflow.'5'.inputs.height = $BaseHeight
$workflow.'6'.inputs.text = $Prompt
$workflow.'7'.inputs.text = $NegativePrompt
$workflow.'10'.inputs.width = $OutputWidth
$workflow.'10'.inputs.height = $OutputHeight
$workflow.'11'.inputs.seed = $Seed
$workflow.'9'.inputs.filename_prefix = $OutputPrefix

$body = @{ prompt = $workflow } | ConvertTo-Json -Depth 20
$queued = Invoke-RestMethod -Uri "$server/prompt" -Method Post -ContentType 'application/json' -Body $body
$promptId = $queued.prompt_id
Write-Host "Queued local final: $promptId"

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

throw 'Local final generation timed out after twelve minutes.'
