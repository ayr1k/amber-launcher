# SPDX-License-Identifier: MPL-2.0
# Read-only observation, restricted to the test-owned process ID.
param([int]$GameProcessId,[string]$OutputPath)
Add-Type @"
using System;using System.Text;using System.Runtime.InteropServices;using System.Collections.Generic;
public class AmberWindowProbe {
 public delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f,IntPtr p);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder s,int n);
 [StructLayout(LayoutKind.Sequential)] public struct Rect {public int left,top,right,bottom;}
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out Rect r);
 public class Row {public long handle;public string title,windowClass;public bool visible,minimized;public Rect bounds;}
 public static List<Row> Read(uint target){var rows=new List<Row>();EnumWindows((h,p)=>{uint pid;GetWindowThreadProcessId(h,out pid);if(pid==target){var t=new StringBuilder(1024);var c=new StringBuilder(256);Rect r;GetWindowText(h,t,t.Capacity);GetClassName(h,c,c.Capacity);GetWindowRect(h,out r);rows.Add(new Row{handle=h.ToInt64(),title=t.ToString(),windowClass=c.ToString(),visible=IsWindowVisible(h),minimized=IsIconic(h),bounds=r});}return true;},IntPtr.Zero);return rows;}
}
"@
$gameProcess=Get-Process -Id $GameProcessId -ErrorAction Stop
$result=[ordered]@{pid=$GameProcessId;executable=$gameProcess.Path;start=$gameProcess.StartTime.ToFileTimeUtc().ToString();windows=@([AmberWindowProbe]::Read($GameProcessId))}
$result | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputPath -Encoding utf8
$result | ConvertTo-Json -Depth 6
