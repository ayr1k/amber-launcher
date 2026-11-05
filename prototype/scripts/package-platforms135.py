#!/usr/bin/env python3
"""Local, unsigned platform packages from already-built edition stages.
Electron ZIPs must be accompanied by their official SHASUMS256.txt.
No publishing, signing, user-data access or system installation.
"""
from pathlib import Path
import argparse, hashlib, io, json, plistlib, struct, tarfile, zipfile, time
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--cache',required=True);args=parser.parse_args()
cache=Path(args.cache);pkg=json.loads((root/'package.json').read_text());version=pkg['version'];electron=pkg['devDependencies']['electron'];base=root/'releases'/version
sums={line.split()[-1].lstrip('*'):line.split()[0] for line in (cache/'SHASUMS256.txt').read_text().splitlines() if line.strip()}
def stage_files(name,platform):
 stage=base/'stages'/name
 for folder in ['desktop','dist/client']:
  for p in (stage/folder).rglob('*'):
   if not p.is_file():continue
   rel=p.relative_to(stage).as_posix()
   if '/bin/seed-engine' in rel and p.name!='seed-engine-'+platform:continue
   yield rel,p.read_bytes(),0o755 if p.name=='seed-engine-'+platform else 0o644
 for file in ['package.json','LICENSE','THIRD_PARTY_NOTICES.md','CHANGELOG.md','RELEASE-ACCEPTANCE.md']:yield file,(stage/file).read_bytes(),0o644
 yield 'PLATFORMS-1.3.5.md',(root/'PLATFORMS-1.3.5.md').read_bytes(),0o644
def runtime(platform):
 name=f'electron-v{electron}-{platform}.zip';p=cache/name
 if hashlib.sha256(p.read_bytes()).hexdigest()!=sums[name]:raise ValueError('Runtime checksum failed: '+name)
 return zipfile.ZipFile(p)
def write_sum(p):
 (p.parent/(p.name+'.sha256')).write_text(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n');print('LOCAL_PACKAGE_READY',p,flush=True)
def tar_entry(t,name,data,mode=0o644,link=None):
 info=tarfile.TarInfo(name);info.mode=mode;info.mtime=0
 if link is not None:info.type=tarfile.SYMTYPE;info.linkname=link;info.size=0;t.addfile(info)
 else:info.size=len(data);t.addfile(info,io.BytesIO(data))
for name in ['AMBER','AmberE']:
 if not (base/'stages'/name/'package.json').is_file():continue
 icon=(root/'build/ambere.png' if name=='AmberE' else root/'public/brand/app-icon.png').read_bytes()
 size=struct.unpack('>I',icon[16:20])[0];icon_type={128:b'ic07',256:b'ic08',512:b'ic09',1024:b'ic10'}[size]
 icns=b'icns'+struct.pack('>I',len(icon)+16)+icon_type+struct.pack('>I',len(icon)+8)+icon
 for arch in ['x64','arm64']:
  target='darwin-'+arch;out=base/f'{name}-{version}-mac-{arch}.zip';app=name+'.app/'
  with runtime(target) as src,zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as dst:
   for info in src.infolist():
    if not info.filename.startswith('Electron.app/') or '/_CodeSignature/' in info.filename or 'default_app.asar' in info.filename:continue
    data=src.read(info);rel=info.filename.removeprefix('Electron.app/');info.filename=app+rel
    if rel=='Contents/Info.plist':
     v=plistlib.loads(data);v.update(CFBundleName=name,CFBundleDisplayName=name,CFBundleIdentifier='io.github.ayr1k.'+name.lower(),CFBundleShortVersionString=version,CFBundleVersion=version);data=plistlib.dumps(v)
    if rel=='Contents/Resources/electron.icns':data=icns
    dst.writestr(info,data)
   for original,notice in [('LICENSE','LICENSE-Electron.txt'),('LICENSES.chromium.html','LICENSES.chromium.html')]:
    i=zipfile.ZipInfo(app+'Contents/Resources/'+notice);i.create_system=3;i.external_attr=0o100644<<16;i.compress_type=zipfile.ZIP_DEFLATED;dst.writestr(i,src.read(original))
   for rel,data,mode in stage_files(name,target):
    i=zipfile.ZipInfo(app+'Contents/Resources/app/'+rel);i.create_system=3;i.external_attr=(0o100000|mode)<<16;i.compress_type=zipfile.ZIP_DEFLATED;dst.writestr(i,data)
  write_sum(out)
 # A Debian package with explicit dependencies; no maintainer scripts or data migration.
 debname=name.lower();control=f'Package: {debname}\nVersion: {version}\nArchitecture: amd64\nMaintainer: AMBER contributors\nSection: games\nPriority: optional\nDepends: libgtk-3-0 | libgtk-3-0t64, libnss3, libasound2 | libasound2t64, libgbm1, libxss1, libxtst6, libsecret-1-0\nDescription: {name} Minecraft launcher (unsigned)\n'
 ctl=io.BytesIO();data=io.BytesIO()
 with tarfile.open(fileobj=ctl,mode='w:gz') as t:tar_entry(t,'./control',control.encode())
 with tarfile.open(fileobj=data,mode='w:gz') as t:
  with runtime('linux-x64') as src:
   for info in src.infolist():
    if info.is_dir() or info.filename=='resources/default_app.asar':continue
    b=src.read(info);mode=(info.external_attr>>16)&0o777;link=b.decode() if (info.external_attr>>16)&0o170000==0o120000 else None
    tar_entry(t,'./opt/'+debname+'/'+info.filename,b,0o4755 if info.filename=='chrome-sandbox' else (mode or 0o644),link)
  for rel,b,mode in stage_files(name,'linux-x64'):tar_entry(t,'./opt/'+debname+'/resources/app/'+rel,b,mode)
  tar_entry(t,'./usr/bin/'+debname,f'#!/bin/sh\nexec /opt/{debname}/electron "$@"\n'.encode(),0o755)
  tar_entry(t,'./usr/share/applications/'+debname+'.desktop',f'[Desktop Entry]\nName={name}\nExec={debname} %U\nIcon={debname}\nType=Application\nCategories=Game;\nTerminal=false\n'.encode())
  tar_entry(t,'./usr/share/icons/hicolor/256x256/apps/'+debname+'.png',(root/'build/ambere.png' if name=='AmberE' else root/'public/brand/app-icon.png').read_bytes())
 out=base/f'{name}-{version}-linux-x64.deb'
 with out.open('wb') as f:
  f.write(b'!<arch>\n')
  for filename,b in [('debian-binary',b'2.0\n'),('control.tar.gz',ctl.getvalue()),('data.tar.gz',data.getvalue())]:
   f.write(f'{filename+"/":<16}{0:<12}{0:<6}{0:<6}{"100644":<8}{len(b):<10}`\n'.encode());f.write(b)
   if len(b)%2:f.write(b'\n')
 write_sum(out)
 # Experimental FreeBSD application bundle uses the system-maintained Electron/OpenJDK.
 out=base/f'{name}-{version}-freebsd-x64-experimental.tar.gz'
 with tarfile.open(out,'w:gz') as t:
  for rel,b,mode in stage_files(name,'freebsd-x64'):tar_entry(t,name+'/'+rel,b,mode)
  tar_entry(t,name+'/launch.sh',b'#!/bin/sh\ncd -- "$(dirname -- "$0")" || exit 1\nexec "${AMBER_ELECTRON:-electron}" . "$@"\n',0o755)
  tar_entry(t,name+'/build-map.sh',b'#!/bin/sh\nset -eu\ncd -- "$(dirname -- "$0")"\ncc -O2 -fwrapv -I desktop/vendor/cubiomes desktop/seed-engine134.c $(find desktop/vendor/cubiomes -name "*.c" ! -name tests.c ! -name xradv.c ! -name quadbase.c) -lm -o desktop/bin/seed-engine-freebsd-x64\n',0o755)
  tar_entry(t,name+'/FREEBSD-README.txt',b'Experimental, not runtime-tested. Requires community Electron (set AMBER_ELECTRON to its executable), OpenJDK and a system keyring. Run build-map.sh with the system C compiler before using the seed map. Servers and utilities are implemented; Minecraft client launch is not enabled because upstream does not supply FreeBSD LWJGL natives. No claim of full FreeBSD game support.\n')
 write_sum(out)
