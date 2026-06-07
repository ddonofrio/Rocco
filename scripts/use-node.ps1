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

$nodeVersion = 'v24.16.0'
$repoRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($scriptRoot, '..'))
$workspaceRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($repoRoot, '..'))
$toolsRoot = [System.IO.Path]::Combine($workspaceRoot, '_tools')
$nodeDirName = "node-$nodeVersion-win-x64"
$nodeDir = [System.IO.Path]::Combine($toolsRoot, $nodeDirName)
$nodeExe = [System.IO.Path]::Combine($nodeDir, 'node.exe')

if (!(Test-Path $nodeExe)) {
  if (!(Test-Path $toolsRoot)) {
    New-Item -ItemType Directory -Path $toolsRoot | Out-Null
  }

  $zipPath = [System.IO.Path]::Combine($env:TEMP, "$nodeDirName.zip")
  $zipUrl = "https://nodejs.org/dist/$nodeVersion/$nodeDirName.zip"
  curl.exe -L $zipUrl -o $zipPath | Out-Null
  Expand-Archive -Path $zipPath -DestinationPath $toolsRoot -Force
}

$env:PATH = "$nodeDir;$env:PATH"
