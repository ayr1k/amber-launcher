# SPDX-License-Identifier: MPL-2.0
# Called only for general discovery, with no inputs from a game or a library.
$ErrorActionPreference = 'Stop'
$adminOwners = @('S-1-5-18', 'S-1-5-32-544',
    'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464')
$sid = [System.Security.Principal.SecurityIdentifier]
$write = [System.Security.AccessControl.FileSystemRights] 'Write, Delete, DeleteSubdirectoriesAndFiles, ChangePermissions, TakeOwnership'
# An ancestor may allow new siblings. Replacing a protected child must require admin rights.
$replace = [System.Security.AccessControl.FileSystemRights] 'DeleteSubdirectoriesAndFiles, Delete, WriteAttributes, WriteExtendedAttributes, ChangePermissions, TakeOwnership'
function Test-AdminControl($entry, $rights) {
    if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { return $false }
    $acl = $entry.GetAccessControl()
    if ($acl.GetOwner($sid).Value -notin $adminOwners) { return $false }
    $descriptor = [System.Security.AccessControl.RawSecurityDescriptor]::new($acl.GetSecurityDescriptorBinaryForm(), 0)
    if ($null -eq $descriptor.DiscretionaryAcl) { return $false }
    foreach ($rule in $acl.GetAccessRules($true, $true, $sid)) {
        if ($rule.AccessControlType -ne 'Allow' -or ($rule.PropagationFlags -band 2)) { continue }
        if ((($rule.FileSystemRights -band $rights) -or ([int]$rule.FileSystemRights -band 0x50000000)) -and $rule.IdentityReference.Value -notin $adminOwners) { return $false }
    }
    return $true
}
function Test-InstalledJava($homeDir, $exe) {
    for ($p = $homeDir.Parent; $p; $p = $p.Parent) {
        $rights = if ($p.Parent) { $write } else { $replace }
        if (!(Test-AdminControl $p $rights)) { return $false }
    }
    $pending = New-Object 'System.Collections.Generic.Stack[System.IO.FileSystemInfo]'
    $pending.Push($homeDir)
    $count = 0
    while ($pending.Count) {
        $entry = $pending.Pop()
        if (++$count -gt 24000 -or !(Test-AdminControl $entry $write)) { return $false }
        if ($entry -is [IO.DirectoryInfo]) {
            foreach ($child in $entry.GetFileSystemInfos()) { $pending.Push($child) }
        }
    }
    $sig = Get-AuthenticodeSignature -LiteralPath $exe
    if ($sig.Status -ne 'Valid') { return $false }
    $publisher = $sig.SignerCertificate.GetNameInfo('SimpleName', $false)
    return $publisher -in @('Microsoft Corporation', 'Oracle America, Inc.', 'Oracle Corporation', 'Eclipse Foundation, Inc.', 'Eclipse.org Foundation, Inc.')
}
$found = @()
$programs = [Environment]::GetFolderPath('ProgramFiles')
foreach ($vendor in @('Java','Eclipse Adoptium','Microsoft')) {
    $parent = [IO.DirectoryInfo]::new([IO.Path]::Combine($programs,$vendor))
    if (!$parent.Exists) { continue }
    foreach ($candidate in $parent.GetDirectories()) {
        $exe = [IO.Path]::Combine($candidate.FullName,'bin','java.exe')
        if (![IO.File]::Exists($exe)) { continue }
        try { if (Test-InstalledJava $candidate $exe) { $found += $exe } } catch { continue }
    }
}
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
ConvertTo-Json -Compress -InputObject $found
