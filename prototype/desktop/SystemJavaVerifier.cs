// SPDX-License-Identifier: MPL-2.0
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Cryptography.X509Certificates;
using System.Security.Principal;
using System.Text;
using System.Web.Script.Serialization;

[assembly: DefaultDllImportSearchPaths(DllImportSearchPath.System32)]

internal static class SystemJavaVerifier
{
    static readonly HashSet<string> Owners = new HashSet<string> {
        "S-1-5-18", "S-1-5-32-544",
        "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464"
    };
    static readonly HashSet<string> Publishers = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
        "Microsoft Corporation", "Oracle America, Inc.", "Oracle Corporation",
        "Eclipse Foundation, Inc.", "Eclipse.org Foundation, Inc."
    };

    const FileSystemRights Replace = FileSystemRights.DeleteSubdirectoriesAndFiles | FileSystemRights.Delete |
        FileSystemRights.WriteAttributes | FileSystemRights.WriteExtendedAttributes |
        FileSystemRights.ChangePermissions | FileSystemRights.TakeOwnership;
    const FileSystemRights Write = FileSystemRights.Write | Replace;

    static bool Protected(FileSystemInfo entry, FileSystemRights rights)
    {
        if ((entry.Attributes & FileAttributes.ReparsePoint) != 0) return false;
        var directory = entry as DirectoryInfo;
        FileSystemSecurity acl = directory == null ? (FileSystemSecurity)((FileInfo)entry).GetAccessControl() : directory.GetAccessControl();
        if (!Owners.Contains(acl.GetOwner(typeof(SecurityIdentifier)).Value)) return false;
        if (new RawSecurityDescriptor(acl.GetSecurityDescriptorBinaryForm(), 0).DiscretionaryAcl == null) return false;
        foreach (FileSystemAccessRule rule in acl.GetAccessRules(true, true, typeof(SecurityIdentifier))) {
            if (rule.AccessControlType != AccessControlType.Allow ||
                (rule.PropagationFlags & PropagationFlags.InheritOnly) != 0) continue;
            const int GenericWriteOrAll = 0x50000000;
            if (((int)rule.FileSystemRights & ((int)rights | GenericWriteOrAll)) != 0 &&
                !Owners.Contains(rule.IdentityReference.Value)) return false;
        }
        return true;
    }

    static bool TrustedTree(DirectoryInfo home)
    {
        for (var parent = home.Parent; parent != null; parent = parent.Parent)
            if (!Protected(parent, parent.Parent == null ? Replace : Write)) return false;
        var pending = new Stack<FileSystemInfo>();
        pending.Push(home);
        int count = 0;
        while (pending.Count != 0) {
            var entry = pending.Pop();
            if (++count > 24000 || !Protected(entry, Write)) return false;
            var directory = entry as DirectoryInfo;
            if (directory != null)
                foreach (var child in directory.EnumerateFileSystemInfos()) pending.Push(child);
        }
        return true;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct FileTrust { public uint Size; public string Path; public IntPtr Handle, KnownSubject; }
    [StructLayout(LayoutKind.Sequential)]
    struct TrustData {
        public uint Size; public IntPtr Callback, Client;
        public uint UI, Revocation, Choice; public IntPtr File;
        public uint Action; public IntPtr State, Url;
        public uint Flags, Context; public IntPtr SignatureSettings;
    }
    // Only the leading two fields of CRYPT_PROVIDER_CERT are needed.
    [StructLayout(LayoutKind.Sequential)]
    struct ProviderCert { public uint Size; public IntPtr Certificate; }

    [DllImport("wintrust.dll", ExactSpelling = true)]
    static extern int WinVerifyTrust(IntPtr window, ref Guid action, ref TrustData data);
    [DllImport("wintrust.dll", ExactSpelling = true)]
    static extern IntPtr WTHelperProvDataFromStateData(IntPtr state);
    [DllImport("wintrust.dll", ExactSpelling = true)]
    static extern IntPtr WTHelperGetProvSignerFromChain(IntPtr provider, uint index, bool counterSigner, uint counterIndex);
    [DllImport("wintrust.dll", ExactSpelling = true)]
    static extern IntPtr WTHelperGetProvCertFromChain(IntPtr signer, uint index);

    static bool TrustedPublisher(string path)
    {
        var file = new FileTrust { Size = (uint)Marshal.SizeOf(typeof(FileTrust)), Path = path };
        var action = new Guid("00AAC56B-CD44-11d0-8CC2-00C04FC295EE"); // WINTRUST_ACTION_GENERIC_VERIFY_V2
        const uint NoUI = 2, FileChoice = 1, Verify = 1, Close = 2, CacheOnlyUrlRetrieval = 0x1000;
        var data = new TrustData { Size = (uint)Marshal.SizeOf(typeof(TrustData)), UI = NoUI, Choice = FileChoice,
            Action = Verify, Flags = CacheOnlyUrlRetrieval, File = Marshal.AllocHGlobal((int)file.Size) };
        Marshal.StructureToPtr(file, data.File, false);
        try {
            int result = WinVerifyTrust(new IntPtr(-1), ref action, ref data);
            if (result != 0) {
                // Unsigned, bad digest, untrusted or otherwise invalid certificates are rejected.
                // Provider/OS failures must stay distinguishable from an empty inventory.
                uint code = unchecked((uint)result);
                if (code == 0x800B0100 || code == 0x80096010 || code == 0x800B0004 ||
                    (code >= 0x800B0101 && code <= 0x800B0114 && code != 0x800B010E)) return false;
                throw new InvalidOperationException("Authenticode verifier unavailable: " + code.ToString("X8"));
            }
            // Bind the publisher check to the signer that WinVerifyTrust actually accepted.
            var provider = WTHelperProvDataFromStateData(data.State);
            var signer = provider == IntPtr.Zero ? IntPtr.Zero : WTHelperGetProvSignerFromChain(provider, 0, false, 0);
            var leaf = signer == IntPtr.Zero ? IntPtr.Zero : WTHelperGetProvCertFromChain(signer, 0);
            if (leaf == IntPtr.Zero) throw new InvalidOperationException("Verified certificate unavailable");
            var cert = (ProviderCert)Marshal.PtrToStructure(leaf, typeof(ProviderCert));
            using (var x509 = new X509Certificate2(cert.Certificate))
                return Publishers.Contains(x509.GetNameInfo(X509NameType.SimpleName, false));
        } finally {
            data.Action = Close;
            WinVerifyTrust(new IntPtr(-1), ref action, ref data);
            Marshal.DestroyStructure(data.File, typeof(FileTrust));
            Marshal.FreeHGlobal(data.File);
        }
    }

    static int Main()
    {
        var paths = new List<string>();
        bool incomplete = false;
        string programs = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        if (String.IsNullOrEmpty(programs)) return 1;
        foreach (string vendor in new[] { "Java", "Eclipse Adoptium", "Microsoft" }) {
            try {
                foreach (var home in new DirectoryInfo(Path.Combine(programs, vendor)).GetDirectories()) {
                    string path = Path.Combine(home.FullName, "bin", "java.exe");
                    try {
                        File.GetAttributes(path);
                        if (TrustedTree(home) && TrustedPublisher(path)) paths.Add(path);
                    } catch (FileNotFoundException) { }
                      catch (DirectoryNotFoundException) { }
                      catch (UnauthorizedAccessException) { incomplete = true; }
                      catch (IOException) { incomplete = true; }
                      catch (InvalidOperationException) { incomplete = true; }
                }
            } catch (DirectoryNotFoundException) { }
              catch (UnauthorizedAccessException) { incomplete = true; }
        }
        Console.OutputEncoding = new UTF8Encoding(false);
        Console.WriteLine(new JavaScriptSerializer().Serialize(new { paths, incomplete }));
        return 0;
    }
}
