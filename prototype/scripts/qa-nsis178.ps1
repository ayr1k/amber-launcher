# SPDX-License-Identifier: MPL-2.0
# One-off A/B experiment for the 1.7.8 task on disposable GitHub Windows hosts.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:AMBER_TEST_RUNNER -ne 'github-hosted' -or $env:RUNNER_OS -ne 'Windows') {
  throw 'Installer and upgrade trials require an isolated GitHub-hosted Windows runner.'
}
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$version = (Get-Content "$root/package.json" -Raw | ConvertFrom-Json).version
if ($version -ne '1.7.8') { throw 'Expected 1.7.8 staged installers' }
$out = Join-Path $env:RUNNER_TEMP ('amber-nsis-' + [guid]::NewGuid())
New-Item $out -ItemType Directory | Out-Null
function Run-Setup($file, $destination) {
  $watch = [Diagnostics.Stopwatch]::StartNew()
  $process = Start-Process -FilePath $file -ArgumentList "/S /currentuser /D=$destination" -WindowStyle Hidden -PassThru -Wait
  if ($process.ExitCode -ne 0) { throw "Setup exited $($process.ExitCode)" }
  return $watch.ElapsedMilliseconds
}
function Remove-Trial($directory, $product) {
  $uninstaller = Join-Path $directory "Uninstall $product.exe"
  $process = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
  if ($process.ExitCode -ne 0 -or (Test-Path "$directory/$product.exe")) { throw "Uninstall failed for $product" }
}
function Test-InstalledStartup($directory, $product) {
  $profile = Join-Path $out ([guid]::NewGuid().ToString())
  $library = Join-Path $profile 'library'
  New-Item -ItemType Directory -Path $library -Force | Out-Null
  @{schema=1;path=$library;onboarded=$false} | ConvertTo-Json | Set-Content (Join-Path $profile 'storage.json') -Encoding utf8
  $env:AMBER_SMOKE_ROOT = $profile
  $stdout = Join-Path $profile 'smoke.txt'
  $proc = Start-Process -FilePath "$directory/$product.exe" -ArgumentList '--smoke-test' -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput $stdout -RedirectStandardError (Join-Path $profile 'stderr.txt')
  if ($proc.ExitCode -ne 0 -or !(Select-String -LiteralPath $stdout -Pattern 'AMBER_DESKTOP_AND_IPC_OK' -Quiet)) {throw 'Installed startup/IPC failed'}
}
function Get-Payload($directory) {
  $manifest = @{}
  foreach ($file in Get-ChildItem -LiteralPath $directory -Recurse -Force -File) {
    $relative = [IO.Path]::GetRelativePath($directory, $file.FullName)
    $manifest[$relative] = (Get-FileHash -LiteralPath $file.FullName).Hash
  }
  return $manifest
}
function Assert-Payload($directory, $expected, $product) {
  $actual = Get-Payload $directory
  foreach ($path in $expected.Keys) {
    if ($expected[$path] -ne $actual[$path]) { throw "Installed payload mismatch: $path" }
  }
  foreach ($path in $actual.Keys) {
    if (!$expected.ContainsKey($path) -and $path -notin @("Uninstall $product.exe","$product-INSTALL.txt")) {
      throw "Unexpected installed file: $path"
    }
  }
}
$results = @()
foreach ($product in @('AMBER','AmberE')) {
  $repo = if ($product -eq 'AMBER') {'amber-launcher'} else {'AmberE'}
  $digest = if ($product -eq 'AMBER') {'76e22e544e5e1b1a64482333ab58716b7c1c0bbf87f3ff515e5466d9fbd5705e'} else {'081309dd5d6e792bed7279c40c4a78af9e9e4442530d8268e42b53726bb80765'}
  $prior = "$out/$product-1.7.7.exe"
  Invoke-WebRequest "https://github.com/ayr1k/$repo/releases/download/v1.7.7/$product-1.7.7-Setup-x64.exe" -OutFile $prior
  if ((Get-FileHash $prior).Hash -ne $digest) { throw 'Old installer SHA-256 mismatch' }
  $staged = "$root/releases/$version/stages/$product"
  $payload = "$root/releases/$version/$product/win-unpacked"
  $expected = Get-Payload $payload
  $stagedFileCount = $expected.Count
  # installSection.nsh installs UNINSTALLER_ICON alongside the app payload.
  $expected['uninstallerIcon.ico'] = (Get-FileHash "$staged/build/icon.ico").Hash
  $logical = (Get-ChildItem $payload -Recurse -File | Measure-Object Length -Sum).Sum
  $template = (Get-Content "$root/electron-builder.yml" -Raw).Replace('AMBER',$product).Replace('io.github.ayr1k.amber',('io.github.ayr1k.' + $product.ToLowerInvariant()))
  $config = "$out/$product.yml"
  Set-Content -LiteralPath $config -Value $template -Encoding utf8
  $data = Join-Path $env:APPDATA $product
  New-Item $data -ItemType Directory -Force | Out-Null
  $marker = Join-Path $data 'qa178-preservation.txt'
  [IO.File]::WriteAllText($marker,'disposable upgrade fixture')
  foreach ($variant in @('default','solid')) {
    $dir = "$out/$product-$variant"
    $args178 = @('--projectDir',$staged,'--prepackaged',$payload,'--config',$config,'--win','nsis','--x64','--publish','never',"-c.directories.output=$dir","-c.electronVersion=45.0.0")
    if ($variant -eq 'solid') { $args178 += '-c.nsis.differentialPackage=false' }
    & "$root/node_modules/.bin/electron-builder.cmd" @args178
    if ($LASTEXITCODE) { throw 'Experimental repack failed' }
    $installer = "$dir/$product-$version-Setup-x64.exe"
    $fresh = Join-Path $out "$product-$variant-fresh"
    $cleanMs = Run-Setup $installer $fresh
    Assert-Payload $fresh $expected $product
    Test-InstalledStartup $fresh $product
    Remove-Trial $fresh $product
    $upgrade = Join-Path $out "$product-$variant-upgrade"
    $null = Run-Setup $prior $upgrade
    if ((Get-Content "$upgrade/resources/app/package.json" -Raw | ConvertFrom-Json).version -ne '1.7.7') {throw 'Previous version missing'}
    $upgradeMs = Run-Setup $installer $upgrade
    Assert-Payload $upgrade $expected $product
    Test-InstalledStartup $upgrade $product
    $backup = (Get-Content "$env:LOCALAPPDATA/$product/previous-program.txt" -Raw).Trim()
    if ((Get-Content "$backup/resources/app/package.json" -Raw | ConvertFrom-Json).version -ne '1.7.7') {throw 'Previous program backup missing'}
    if ([IO.File]::ReadAllText($marker) -ne 'disposable upgrade fixture') {throw 'Data marker changed'}
    Remove-Trial $upgrade $product
    $results += [pscustomobject]@{edition=$product;variant=$variant;exeBytes=(Get-Item $installer).Length;logicalBytes=$logical;files=$stagedFileCount;freshMs=$cleanMs;upgradeMs=$upgradeMs;payload='sha256 matched';upgrade='1.7.7 backup and data marker verified'}
    Write-Output ('NSIS178 ' + ($results[-1] | ConvertTo-Json -Compress))
  }
}
$results | ConvertTo-Json | Set-Content "$env:RUNNER_TEMP/nsis178.json"
