# SPDX-License-Identifier: MPL-2.0
param([Parameter(Mandatory=$true)][string]$InstallDirectory,[string]$PreviousDirectory='',[string]$StateRoot='',[switch]$SkipGameCheck)
$ErrorActionPreference='Stop'
if (!$StateRoot) { $StateRoot=Join-Path $env:LOCALAPPDATA 'AMBER' }
New-Item -ItemType Directory -Path $StateRoot -Force | Out-Null
$log=Join-Path $StateRoot 'installer-last-error.txt'
function Assert-PlainPath([string]$Path) {
  $cursor=[IO.Path]::GetFullPath($Path)
  while ($cursor) {
    if (Test-Path -LiteralPath $cursor) { if ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Installation paths cannot contain directory links.' } }
    $parent=[IO.Directory]::GetParent($cursor)
    if (!$parent) { break }; $cursor=$parent.FullName
  }
}
function Get-PlainFiles([string]$Path) {
  foreach ($item in Get-ChildItem -LiteralPath $Path -Force) {
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Existing program contains linked files. Installation stopped.' }
    if ($item.PSIsContainer) { Get-PlainFiles $item.FullName } else { $item }
  }
}
function Assert-AppFolder([string]$Path) {
  Assert-PlainPath $Path
  $metadata=Join-Path $Path 'resources/app/package.json'
  if (!(Test-Path -LiteralPath (Join-Path $Path 'AMBER.exe')) -or !(Test-Path -LiteralPath $metadata) -or ((Get-Content -LiteralPath $metadata -Raw | ConvertFrom-Json).name -ne 'amber-launcher')) { throw 'Please choose an empty folder or an existing AMBER program folder.' }
  if (Test-Path -LiteralPath (Join-Path $Path 'library')) { throw 'Game data is inside the program folder. Move it using AMBER settings before upgrading.' }
}
function Get-FileSha256([string]$Path) {
  $stream=[IO.File]::OpenRead($Path)
  $hash=[Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($hash.ComputeHash($stream)) } finally { $hash.Dispose();$stream.Dispose() }
}
try {
  $target=[IO.Path]::GetFullPath($InstallDirectory).TrimEnd('\')
  Assert-PlainPath $target
  if ($target -eq [IO.Path]::GetPathRoot($target).TrimEnd('\')) { throw 'Do not install in a drive root.' }
  $userData=[IO.Path]::GetFullPath((Join-Path $env:APPDATA 'AMBER'))
  $library=Join-Path $userData 'library'
  $config=Join-Path $userData 'storage.json'
  if (Test-Path -LiteralPath $config) { $library=[IO.Path]::GetFullPath((Get-Content -LiteralPath $config -Raw | ConvertFrom-Json).path) }
  foreach ($data in @($userData,$library)) {
    $data=$data.TrimEnd('\')
    if ($target.Equals($data,[StringComparison]::OrdinalIgnoreCase) -or $target.StartsWith($data+'\',[StringComparison]::OrdinalIgnoreCase) -or $data.StartsWith($target+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Program and game data directories must be separate.' }
  }
  if (!$SkipGameCheck -and (Test-Path -LiteralPath (Join-Path $library 'instances'))) {
    foreach ($instance in Get-ChildItem -LiteralPath (Join-Path $library 'instances') -Directory) {
      $sessionFile=Join-Path $instance.FullName '.amber-session.json'
      if (Test-Path -LiteralPath $sessionFile) {
        $gameSession=Get-Content -LiteralPath $sessionFile -Raw | ConvertFrom-Json
        $running=Get-Process -Id $gameSession.pid -ErrorAction SilentlyContinue
        if ($running) {
          $same=$true
          if ($gameSession.game -and $gameSession.startedAt) {
            $expected=[DateTime]::Parse($gameSession.startedAt).ToUniversalTime()
            $same=[Math]::Abs(($running.StartTime.ToUniversalTime()-$expected).TotalSeconds) -lt 30
          }
          if ($same) { throw 'Please close Minecraft and AMBER before installing an update.' }
        }
      }
    }
  }
  if ((Test-Path -LiteralPath $target) -and @(Get-ChildItem -LiteralPath $target -Force).Count) { Assert-AppFolder $target }
  $previous=$PreviousDirectory
  if (!$previous -and (Test-Path -LiteralPath (Join-Path $target 'AMBER.exe'))) { $previous=$target }
  $files=@()
  if ($previous) { $previous=[IO.Path]::GetFullPath($previous).TrimEnd('\');Assert-AppFolder $previous;$files=@(Get-PlainFiles $previous) }
  $oldSize=($files | Measure-Object -Property Length -Sum).Sum
  $drive=New-Object IO.DriveInfo([IO.Path]::GetPathRoot($target))
  if ($drive.AvailableFreeSpace -lt 1500MB) { throw 'At least 1.5 GB free space is needed on the installation drive.' }
  $backupDrive=New-Object IO.DriveInfo([IO.Path]::GetPathRoot([IO.Path]::GetFullPath($StateRoot)))
  if ($backupDrive.AvailableFreeSpace -lt ($oldSize+512MB)) { throw 'Not enough disk space to preserve the previous program.' }
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  $probe=Join-Path $target ('.amber-write-test-'+[guid]::NewGuid())
  [IO.File]::WriteAllText($probe,'write test'); Remove-Item -LiteralPath $probe
  if ($previous) {
    $backup=Join-Path $StateRoot ('installer-backups/'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid())
    Assert-PlainPath $StateRoot
    New-Item -ItemType Directory -Path $backup -Force | Out-Null
    foreach ($file in $files) {
      $relative=$file.FullName.Substring($previous.Length).TrimStart('\');$destination=Join-Path $backup $relative
      New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($destination)) -Force | Out-Null
      Copy-Item -LiteralPath $file.FullName -Destination $destination
      if ((Get-FileSha256 $file.FullName) -ne (Get-FileSha256 $destination)) { throw 'Previous-program backup verification failed. Existing installation was not removed.' }
    }
    [IO.File]::WriteAllText((Join-Path $StateRoot 'previous-program.txt'),$backup)
  }
  [IO.File]::WriteAllText($log,'Preflight passed. Game data and previous-program backups are retained.')
  exit 0
} catch {
  [IO.File]::WriteAllText($log,$_.Exception.Message)
  Write-Output $_.Exception.Message
  exit 2
}
