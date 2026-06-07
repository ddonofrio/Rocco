param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$NpmArgs
)

$ErrorActionPreference = 'Stop'

$scriptPath = if ($PSCommandPath) { $PSCommandPath } else { $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($scriptPath)) {
  throw '[Rocco] Unable to resolve script path.'
}
$scriptPath = $scriptPath -replace '^Microsoft\.PowerShell\.Core\\FileSystem::', ''
if ($scriptPath.StartsWith('\\?\', [System.StringComparison]::OrdinalIgnoreCase)) {
  $scriptPath = $scriptPath.Substring(4)
}
$scriptRoot = [System.IO.Path]::GetDirectoryName($scriptPath)

$nodeVersion = 'v24.16.0'
$repoRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($scriptRoot, '..'))
$workspaceRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($repoRoot, '..'))
$toolsRoot = [System.IO.Path]::Combine($workspaceRoot, '_tools')
$nodeDirName = "node-$nodeVersion-win-x64"
$nodeDir = [System.IO.Path]::Combine($toolsRoot, $nodeDirName)
$nodeExe = [System.IO.Path]::Combine($nodeDir, 'node.exe')
$npmCli = [System.IO.Path]::Combine($nodeDir, 'node_modules\npm\bin\npm-cli.js')

if (!(Test-Path $nodeExe)) {
  throw "[Rocco] Node was not found in $nodeDir. Run .\scripts\setup.ps1 first."
}

if (!(Test-Path $npmCli)) {
  throw "[Rocco] npm-cli was not found in $npmCli."
}

$env:PATH = "$nodeDir;$env:PATH"

Push-Location $repoRoot
try {
  & $nodeExe $npmCli @NpmArgs
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}
