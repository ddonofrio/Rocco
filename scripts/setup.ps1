param()

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

& ([System.IO.Path]::Combine($scriptRoot, 'use-node.ps1'))
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

& ([System.IO.Path]::Combine($scriptRoot, 'run-npm.ps1')) install
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
