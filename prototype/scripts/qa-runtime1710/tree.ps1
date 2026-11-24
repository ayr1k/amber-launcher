param([int]$RootId,[string]$OutputFile)
$ErrorActionPreference = 'Stop'
# Enumerate Windows parent links, including helpers outside Chromium's metrics API.
Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class RuntimeTree {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  struct Entry {
    public uint size, usage, id; public IntPtr heap; public uint module, threads, parent;
    public int priority; public uint flags;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=260)] public string name;
  }
  [DllImport("kernel32")] static extern IntPtr CreateToolhelp32Snapshot(uint flags, uint id);
  [DllImport("kernel32", CharSet=CharSet.Unicode)] static extern bool Process32FirstW(IntPtr h, ref Entry e);
  [DllImport("kernel32", CharSet=CharSet.Unicode)] static extern bool Process32NextW(IntPtr h, ref Entry e);
  [DllImport("kernel32")] static extern bool CloseHandle(IntPtr h);
  public static HashSet<int> Children(int root) {
    var tree = new HashSet<int>{root}; var links = new Dictionary<int,int>();
    var h = CreateToolhelp32Snapshot(2,0);
    try {
      var e = new Entry(); e.size=(uint)Marshal.SizeOf(e);
      if(!Process32FirstW(h,ref e)) throw new Exception("Process enumeration failed");
      do { links[(int)e.id]=(int)e.parent; } while(Process32NextW(h,ref e));
    } finally { CloseHandle(h); }
    int count; do {count=tree.Count; foreach(var pair in links)
      if(tree.Contains(pair.Value)) tree.Add(pair.Key);
    } while(count!=tree.Count);
    return tree;
  }
}
"@
$writer = [IO.StreamWriter]::new($OutputFile)
try {
  while (Get-Process -Id $RootId -ErrorAction SilentlyContinue) {
    $rows = foreach ($processId in [RuntimeTree]::Children($RootId)) {
      try {
        $proc = [Diagnostics.Process]::GetProcessById($processId)
        [pscustomobject]@{pid=$processId;cpu=$proc.TotalProcessorTime.TotalSeconds;private=$proc.PrivateMemorySize64;ws=$proc.WorkingSet64}
        $proc.Dispose()
      } catch [ArgumentException] { }
    }
    $writer.WriteLine((@{t=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();procs=@($rows)} | ConvertTo-Json -Depth 4 -Compress))
    $writer.Flush()
    Start-Sleep -Milliseconds 500
  }
} finally { $writer.Dispose() }
