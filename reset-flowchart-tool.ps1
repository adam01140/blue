# Reset FlowchartCreationTool from GitHub and integrate Auto-Form-Creator.
# Run:  powershell -ExecutionPolicy Bypass -File "C:\Users\chaabane\Desktop\Finance Forms\blue\reset-flowchart-tool.ps1"
$ErrorActionPreference = 'Stop'
$Target  = 'C:\Users\chaabane\Desktop\FlowchartCreationTool'
$Blue    = 'C:\Users\chaabane\Desktop\Finance Forms\blue'
$Zip     = Join-Path $Blue 'flowchart-integration.zip'
$Repo    = 'https://github.com/Adam01140114/FlowchartCreationTool.git'

Write-Host '1/6 Stopping any running node processes...'
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

if (Test-Path $Target) {
    Write-Host "2/6 Deleting $Target ..."
    try {
        $old = "$Target._old_$(Get-Date -Format yyyyMMdd_HHmmss)"
        Move-Item -LiteralPath $Target -Destination $old
        Remove-Item -LiteralPath $old -Recurse -Force
    } catch {
        Write-Host "   Move failed ($($_.Exception.Message)); deleting in place..."
        Remove-Item -LiteralPath $Target -Recurse -Force
    }
} else {
    Write-Host '2/6 No existing folder to delete.'
}

Write-Host "3/6 Cloning $Repo ..."
git clone $Repo $Target
if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }

Write-Host '4/6 Copying Auto-Form-Creator assets from the blue project...'
New-Item -ItemType Directory -Force -Path "$Target\public\Forms" | Out-Null
Copy-Item -LiteralPath "$Blue\public\Auto-Form-Creator" -Destination "$Target\public\Auto-Form-Creator" -Recurse
Copy-Item -LiteralPath "$Blue\public\Forms\CSS"          -Destination "$Target\public\Forms\CSS" -Recurse
Copy-Item -LiteralPath "$Blue\public\Forms\Example"      -Destination "$Target\public\Forms\Example" -Recurse
Copy-Item -LiteralPath "$Blue\public\CountyLookup"       -Destination "$Target\public\CountyLookup" -Recurse
Copy-Item -LiteralPath "$Blue\public\Pages"              -Destination "$Target\public\Pages" -Recurse
Copy-Item -LiteralPath "$Blue\public\logo.png"           -Destination "$Target\public\logo.png"
if (Test-Path -LiteralPath "$Blue\.env") {
    Copy-Item -LiteralPath "$Blue\.env" -Destination "$Target\.env"
    Write-Host '   .env copied (OPENAI_API_KEY / FIREBASE_* for the AI and publish steps).'
} else {
    Write-Host '   WARNING: no .env in blue project; AI steps will not work until you add one.'
}

Write-Host '5/6 Applying server integration (dev-server.js, auto-form-server/, package.json, HANDOFF)...'
Expand-Archive -LiteralPath $Zip -DestinationPath $Target -Force

Write-Host '6/6 npm install, then starting the dev server...'
Set-Location -LiteralPath $Target
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
Write-Host ''
Write-Host 'Flowchart editor:      http://127.0.0.1:8080/index.html'
Write-Host 'Auto-Form-Creator demo: http://127.0.0.1:8080/Auto-Form-Creator/demo.html'
Write-Host ''
npm start
