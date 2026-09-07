param([string]$OutputDirectory = 'dist/beta-startup')
$ErrorActionPreference = 'Stop'
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
    $outputFile = Join-Path $OutputDirectory 'HTMLtoPPTX.exe'
    & go build -trimpath -ldflags '-H=windowsgui' -o $outputFile .
    if ($LASTEXITCODE -ne 0) { throw 'Windows build failed' }
    Get-FileHash -Algorithm SHA256 -LiteralPath $outputFile
} finally { Pop-Location }
