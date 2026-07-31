param(
    [int]$Port = 8188
)

$ErrorActionPreference = 'Stop'
$root = 'D:\AI\ComfyUI'
$cacheRoot = 'D:\AI\cache'
$python = Join-Path $root 'venv\Scripts\python.exe'
$main = Join-Path $root 'app\main.py'
$logs = Join-Path $root 'logs'
$temp = Join-Path $cacheRoot 'temp\comfyui'
$output = Join-Path $root 'app\output'
$healthUrl = "http://127.0.0.1:$Port/system_stats"

try {
    Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 | Out-Null
    Write-Host "ComfyUI is already running at http://127.0.0.1:$Port"
    exit 0
} catch {
    # Start a local-only instance below.
}

if (-not (Test-Path -LiteralPath $python) -or -not (Test-Path -LiteralPath $main)) {
    throw 'ComfyUI is not installed at D:\AI\ComfyUI.'
}

@($logs, $temp, $output, 'D:\AI\pip-cache', 'D:\AI\cache\huggingface', 'D:\AI\cache\torch') |
    ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

$env:PIP_CACHE_DIR = 'D:\AI\pip-cache'
$env:HF_HOME = 'D:\AI\cache\huggingface'
$env:HUGGINGFACE_HUB_CACHE = 'D:\AI\cache\huggingface\hub'
$env:TORCH_HOME = 'D:\AI\cache\torch'
$env:XDG_CACHE_HOME = 'D:\AI\cache'
$env:TEMP = $temp
$env:TMP = $temp

$arguments = @(
    $main,
    '--listen', '127.0.0.1',
    '--port', $Port,
    '--lowvram',
    '--reserve-vram', '1',
    '--preview-method', 'latent2rgb',
    '--temp-directory', $temp,
    '--output-directory', $output,
    '--disable-auto-launch',
    '--disable-all-custom-nodes'
)

$process = Start-Process `
    -FilePath $python `
    -ArgumentList $arguments `
    -WorkingDirectory (Join-Path $root 'app') `
    -RedirectStandardOutput (Join-Path $logs 'stdout.log') `
    -RedirectStandardError (Join-Path $logs 'stderr.log') `
    -WindowStyle Hidden `
    -PassThru

for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    try {
        Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 | Out-Null
        Write-Host "ComfyUI started (PID $($process.Id)): http://127.0.0.1:$Port"
        exit 0
    } catch {
        if ($process.HasExited) {
            throw "ComfyUI exited during startup. See $logs\stderr.log"
        }
    }
}

throw "ComfyUI did not become ready. See $logs\stderr.log"
