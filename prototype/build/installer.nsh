; SPDX-License-Identifier: MPL-2.0
!ifndef BUILD_UNINSTALLER
!include nsDialogs.nsh
Var amberShortcutBox
Var amberDesktopShortcut
!macro customPageAfterChangeDir
  Page custom AmberOptions AmberOptionsLeave
Function AmberOptions
  !insertmacro MUI_HEADER_TEXT "安装选项" "选择 AMBER 的快捷方式。"
  nsDialogs::Create 1018
  Pop $0
  ${NSD_CreateCheckbox} 0 8u 100% 18u "创建桌面快捷方式"
  Pop $amberShortcutBox
  ${NSD_Check} $amberShortcutBox
  nsDialogs::Show
FunctionEnd
Function AmberOptionsLeave
  ${NSD_GetState} $amberShortcutBox $amberDesktopShortcut
FunctionEnd
!macroend
!endif
!macro customCheckAppRunning
  ${nsProcess::FindProcess} "AMBER.exe" $R0
  ${If} $R0 == 0
    IfSilent +2
    MessageBox MB_OK|MB_ICONEXCLAMATION "请先退出 AMBER 和 Minecraft，再安装或卸载。安装程序不会强行结束任务。"
    SetErrorLevel 2
    Quit
  ${EndIf}
  !ifndef BUILD_UNINSTALLER
    InitPluginsDir
    File /oname=$PLUGINSDIR\amber-preflight.ps1 "${BUILD_RESOURCES_DIR}\installer-preflight.ps1"
    ReadRegStr $R3 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
    nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\amber-preflight.ps1" -InstallDirectory "$INSTDIR" -PreviousDirectory "$R3"'
    Pop $R0
    ${If} $R0 != 0
      IfSilent +2
      MessageBox MB_OK|MB_ICONEXCLAMATION "安装前检查未通过，旧程序未移除。请检查磁盘空间、目录权限和游戏进程。详细原因：$LOCALAPPDATA\AMBER\installer-last-error.txt"
      SetErrorLevel 2
      Quit
    ${EndIf}
  !endif
!macroend
!macro customInstall
  ${If} $amberDesktopShortcut == "0"
    Delete "$newDesktopLink"
  ${EndIf}
  FileOpen $R0 "$INSTDIR\AMBER-INSTALL.txt" w
  FileWrite $R0 "AMBER beta 1.1. Game data remains under APPDATA/AMBER or your configured location.$\r$\nPrevious program backup: LOCALAPPDATA/AMBER/previous-program.txt$\r$\n"
  FileClose $R0
!macroend
!ifndef BUILD_UNINSTALLER
Function .onInstFailed
  IfSilent +2
  MessageBox MB_OK|MB_ICONEXCLAMATION "安装未完成。游戏数据保留。旧程序副本位置记录在 $LOCALAPPDATA\AMBER\previous-program.txt，可打开该目录运行 AMBER.exe，或重新安装。"
FunctionEnd
!endif
