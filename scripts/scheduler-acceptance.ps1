param([string]$Exe = 'dist/beta-startup-20260907/HTMLtoPPTX.exe')
$ErrorActionPreference = 'Stop'
$exePath = (Resolve-Path -LiteralPath $Exe).Path
$runDirectory = Join-Path (Split-Path -Parent $exePath) ('scheduler-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runDirectory | Out-Null
$config = Join-Path $runDirectory 'config.json'
$taskName = 'HTMLtoPPTX-Acceptance-' + [guid]::NewGuid().ToString('N')
$reservation = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, 0)
$reservation.Start()
$port = $reservation.LocalEndpoint.Port
$reservation.Stop()
@{ mode='web'; standalonePort=0; webIP='auto'; webPort=$port } | ConvertTo-Json | Set-Content -LiteralPath $config -Encoding UTF8
# Windows PowerShell's UTF8 writer adds a BOM, which the strict JSON reader rejects.
[IO.File]::WriteAllText($config, [IO.File]::ReadAllText($config), [Text.UTF8Encoding]::new($false))
$registered = $false
$info = $null
try {
    $action = New-ScheduledTaskAction -Execute $exePath -Argument ('--background --config "' + $config + '"') -WorkingDirectory $env:TEMP
    $principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings | Out-Null
    $registered = $true
    Start-ScheduledTask -TaskName $taskName
    $deadline = [DateTime]::UtcNow.AddSeconds(20)
    while ([DateTime]::UtcNow -lt $deadline) {
        if (Test-Path -LiteralPath ($config + '.runtime.json')) {
            $info = Get-Content -LiteralPath ($config + '.runtime.json') -Raw | ConvertFrom-Json
            break
        }
        Start-Sleep -Milliseconds 100
    }
    if (-not $info) { throw 'Scheduled application did not publish runtime metadata' }
    if ($info.mode -ne 'web' -or ([uri]$info.url).Port -ne $port) { throw 'Wrong Web binding' }
    $process = Get-Process -Id $info.pid
    if ($process.MainWindowHandle -ne 0) { throw 'Scheduled Web process created a window' }
    $response = Invoke-WebRequest -UseBasicParsing -Uri ($info.url + '/api/runtime')
    if ($response.StatusCode -ne 200) { throw 'Scheduled server did not respond' }
    Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($info.controlURL + '/api/stop') -Headers @{'X-App-Token'=$info.token} | Out-Null
    if (-not $process.WaitForExit(10000)) { throw 'Scheduled server did not exit' }
    @{ result='pass'; logonType='Interactive'; checks=@('actual Task Scheduler launch','unrelated working directory','fixed port','no native window','HTTP response','clean stop'); taskRemoved=$true } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runDirectory 'verification.json') -Encoding UTF8
    Write-Output "PASS: $runDirectory"
} finally {
    if ($info) {
        try { Invoke-WebRequest -UseBasicParsing -Method Post -Uri ($info.controlURL + '/api/stop') -Headers @{'X-App-Token'=$info.token} | Out-Null } catch {}
    }
    if ($registered) {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
}
