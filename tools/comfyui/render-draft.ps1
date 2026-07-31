param(
    [string]$Prompt = 'hand-painted Chinese animation background, warm wooden inn hall, side-scrolling game scene, layered depth, jade green and cinnabar accents, clean composition, no people, no text',
    [string]$NegativePrompt = 'photo, photorealistic, modern furniture, 3d render, dark horror, watermark, logo, text, blurry, low quality, distorted perspective',
    [int]$Seed = 20260713,
    [int]$Width = 512,
    [int]$Height = 512,
    [int]$Steps = 24,
    [string]$OutputPrefix = 'tongfu_draft'
)

$ErrorActionPreference = 'Stop'
$server = 'http://127.0.0.1:8188'
$workflowPath = Join-Path $PSScriptRoot 'workflows\tongfu-draft-512-api.json'
$workflow = Get-Content -LiteralPath $workflowPath -Raw | ConvertFrom-Json

$workflow.'3'.inputs.seed = $Seed
$workflow.'3'.inputs.steps = $Steps
$workflow.'5'.inputs.width = $Width
$workflow.'5'.inputs.height = $Height
$workflow.'6'.inputs.text = $Prompt
$workflow.'7'.inputs.text = $NegativePrompt
$workflow.'9'.inputs.filename_prefix = $OutputPrefix

$body = @{ prompt = $workflow } | ConvertTo-Json -Depth 20
$queued = Invoke-RestMethod -Uri "$server/prompt" -Method Post -ContentType 'application/json' -Body $body
$promptId = $queued.prompt_id
Write-Host "Queued draft: $promptId"

for ($attempt = 0; $attempt -lt 180; $attempt++) {
    Start-Sleep -Seconds 2
    $history = Invoke-RestMethod -Uri "$server/history/$promptId" -TimeoutSec 10
    $entry = $history.PSObject.Properties[$promptId].Value
    if ($entry) {
        if ($entry.status.status_str -eq 'error') {
            throw "Draft failed. Check D:\AI\ComfyUI\logs\stderr.log"
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

throw 'Draft generation timed out after six minutes.'
