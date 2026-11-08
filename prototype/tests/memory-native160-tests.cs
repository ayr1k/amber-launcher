// SPDX-License-Identifier: MPL-2.0
// Fake native API: never opens or trims a real process. Uses the shipped C# logic.
using System;
public sealed class MemoryFake160 : IAmberMemoryApi160 {
 public int opens,closes,trims; public bool denied,identityUnavailable,trimDenied;
 public ulong created=116444736000000000UL+12345678901230UL;
 public uint waited=258; public int error=5;
 public IntPtr handle=new IntPtr(123);
 public IntPtr Open(uint pid){opens++;return denied?IntPtr.Zero:handle;}
 public bool CreationTime(IntPtr h,out ulong time){Check(h);time=created;return !identityUnavailable;}
 public uint Wait(IntPtr h){Check(h);return waited;}
 public bool Trim(IntPtr h){Check(h);trims++;return !trimDenied;}
 public int Error(){return error;}
 public void Close(IntPtr h){Check(h);closes++;}
 void Check(IntPtr h){if(h!=handle)throw new Exception("not the same process handle");}
}
public static class MemoryNativeTests160 {
 static void Check(bool value,string message){if(!value)throw new Exception(message);}
 public static string Run(){
  const double expected=1234567890.123;
  var good=new MemoryFake160();Check(AmberMemory160.Trim(10,expected,good).status=="trimmed"&&good.trims==1&&good.closes==1,"success/same-handle");
  var changed=new MemoryFake160();changed.created+=10;Check(AmberMemory160.Trim(10,expected,changed).status=="identity-mismatch"&&changed.trims==0&&changed.closes==1,"one microsecond identity mismatch");
  var denied=new MemoryFake160();denied.denied=true;Check(AmberMemory160.Trim(20,expected,denied).status=="access-denied"&&denied.trims==0&&denied.closes==0,"permission denied");
  var exited=new MemoryFake160();exited.waited=0;Check(AmberMemory160.Trim(30,expected,exited).status=="exited"&&exited.trims==0&&exited.closes==1,"process exited");
  var unknown=new MemoryFake160();unknown.identityUnavailable=true;unknown.error=6;Check(AmberMemory160.Trim(40,expected,unknown).status=="identity-unavailable"&&unknown.trims==0&&unknown.closes==1,"identity unavailable");
  var noTime=new MemoryFake160();Check(AmberMemory160.Trim(50,Double.NaN,noTime).status=="identity-unavailable"&&noTime.opens==0,"missing trusted time");
  var lateDenied=new MemoryFake160();lateDenied.trimDenied=true;Check(AmberMemory160.Trim(60,expected,lateDenied).status=="access-denied"&&lateDenied.closes==1,"trim permission failure");
  return "MEMORY_NATIVE160_OK: 7 same-handle identity/exit/permission cases; no real processes targeted";
 }
}
