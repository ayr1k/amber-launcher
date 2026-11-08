// SPDX-License-Identifier: MPL-2.0
using System;
using System.Runtime.InteropServices;

public interface IAmberMemoryApi160 {
 IntPtr Open(uint pid);
 bool CreationTime(IntPtr handle, out ulong time);
 uint Wait(IntPtr handle);
 bool Trim(IntPtr handle);
 int Error();
 void Close(IntPtr handle);
}
public sealed class AmberMemoryResult160 {
 public int pid; public bool ok; public int error; public string status;
}
public sealed class AmberMemoryWindows160 : IAmberMemoryApi160 {
 [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
 [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetProcessTimes(IntPtr handle, out ulong creation, out ulong exit, out ulong kernel, out ulong user);
 [DllImport("kernel32.dll", SetLastError=true)] static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);
 [DllImport("psapi.dll", SetLastError=true)] static extern bool EmptyWorkingSet(IntPtr handle);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 public IntPtr Open(uint pid) { return OpenProcess(0x101100, false, pid); }
 public bool CreationTime(IntPtr handle, out ulong time) { ulong exit, kernel, user; return GetProcessTimes(handle, out time, out exit, out kernel, out user); }
 public uint Wait(IntPtr handle) { return WaitForSingleObject(handle, 0); }
 public bool Trim(IntPtr handle) { return EmptyWorkingSet(handle); }
 public int Error() { return Marshal.GetLastWin32Error(); }
 public void Close(IntPtr handle) { CloseHandle(handle); }
}
public static class AmberMemory160 {
 public static AmberMemoryResult160 Trim(int pid, double creationTime) { return Trim(pid, creationTime, new AmberMemoryWindows160()); }
 public static AmberMemoryResult160 Trim(int pid, double creationTime, IAmberMemoryApi160 api) {
  var result = new AmberMemoryResult160 {pid=pid, status="identity-unavailable"};
  if(pid<=0 || Double.IsNaN(creationTime) || Double.IsInfinity(creationTime) || creationTime<=0) return result;
  IntPtr handle=api.Open((uint)pid);
  if(handle==IntPtr.Zero) {result.error=api.Error();result.status=result.error==5?"access-denied":result.error==87?"exited":"open-failed";return result;}
  try {
   ulong fileTime;
   if(!api.CreationTime(handle,out fileTime)) {result.error=api.Error();result.status=result.error==5?"access-denied":"identity-unavailable";return result;}
   // Chromium's Windows base::Time truncates FILETIME to microseconds before
   // InMillisecondsFSinceUnixEpoch. Match that exact double; no tolerance/window.
   if(fileTime<116444736000000000UL || ((fileTime/10UL)-11644473600000000UL)/1000.0!=creationTime) {result.status="identity-mismatch";return result;}
   uint wait=api.Wait(handle);
   if(wait==0) {result.status="exited";return result;}
   if(wait!=258) {result.error=api.Error();result.status=result.error==5?"access-denied":"identity-unavailable";return result;}
   // This handle pins the checked process object, even if its PID is later reused.
   result.ok=api.Trim(handle);result.error=result.ok?0:api.Error();result.status=result.ok?"trimmed":result.error==5?"access-denied":"trim-failed";
   if(!result.ok&&api.Wait(handle)==0)result.status="exited";
   return result;
  } finally {api.Close(handle);}
 }
}
