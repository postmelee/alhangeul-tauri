; Alhangeul NSIS installer hooks
;
; Tauri 기본 NSIS file association 처리는 .hwp/.hwpx의 기본 ProgId를 덮어쓴다. 이 hook은
; 설치·제거 전후로 사용자의 기존 기본값을 snapshot·복원해서 Alhangeul이 Open With 후보로만
; 등록되도록 만든다. MSI는 기본값을 애초에 쓰지 않으므로 대응 hook이 없다.
;
; 계약과 가정
; - snapshot은 제품 전용 key에만 기록한다. 공유 key인 Software\Classes\.{ext}에는 Alhangeul의
;   bookkeeping value를 남기지 않는다.
; - snapshot이 없으면 복원은 no-op이다. "기본값이 원래 없었음"과 "snapshot 자체가 없음"을
;   구분하지 못하면 사용자의 기존 기본 연결을 지우게 된다.
; - State는 snapshot의 마지막 commit marker다. 중단된 이전 작업의 committed snapshot이 있으면
;   다음 설치·제거가 덮어쓰지 않고 같은 원래 기본값을 복원한다.
; - 모든 macro는 사용하는 $R0/$R1을 Push/Pop으로 보존한다. hook 본문은 Tauri installer.nsi
;   안으로 삽입되며 주변 코드의 register 사용을 알 수 없다.
; - UPDATEFILEASSOC는 Tauri installer.nsi가 제공하는 내부 macro이며 installerHooks 공개
;   계약의 일부가 아니다. Tauri를 올릴 때 존재 여부를 확인한다.

!define ALHANGEUL_ASSOC_BACKUP_KEY "Software\Alhangeul\FileAssocBackup"
!define ALHANGEUL_THUMBNAIL_HANDLER "$INSTDIR\AlhangeulThumbnailHandler.dll"

!macro ALHANGEUL_INSTALL_THUMBNAIL
  Push $R0
  Push $R1
  ClearErrors
  System::Call '"${ALHANGEUL_THUMBNAIL_HANDLER}"::AlhangeulThumbnailInstallUser()i.r0'
  ${If} ${Errors}
    StrCpy $R0 1603
  ${EndIf}
  ${If} $R0 != 0
    System::Call '"${ALHANGEUL_THUMBNAIL_HANDLER}"::AlhangeulThumbnailUninstallUser()i.r1'
    DetailPrint "Alhangeul thumbnail registration failed: $R0 (rollback: $R1)"
    Pop $R1
    Pop $R0
    SetErrors
    Abort "Alhangeul thumbnail registration failed."
  ${EndIf}
  Pop $R1
  Pop $R0
!macroend

!macro ALHANGEUL_UNINSTALL_THUMBNAIL
  Push $R0
  ClearErrors
  System::Call '"${ALHANGEUL_THUMBNAIL_HANDLER}"::AlhangeulThumbnailUninstallUser()i.r0'
  ${If} ${Errors}
    StrCpy $R0 1603
  ${EndIf}
  ${If} $R0 != 0
    DetailPrint "Alhangeul thumbnail unregistration failed: $R0"
    Pop $R0
    SetErrors
    Abort "Alhangeul thumbnail unregistration failed."
  ${EndIf}
  Pop $R0
!macroend

!macro ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT EXT
  Push $R0
  Push $R1
  ClearErrors
  ReadRegDWORD $R1 SHELL_CONTEXT "${ALHANGEUL_ASSOC_BACKUP_KEY}\.${EXT}" "State"
  ${If} ${Errors}
    ClearErrors
    ReadRegStr $R0 SHELL_CONTEXT "Software\Classes\.${EXT}" ""
    ${If} ${Errors}
      DeleteRegValue SHELL_CONTEXT "${ALHANGEUL_ASSOC_BACKUP_KEY}\.${EXT}" "Default"
      WriteRegDWORD SHELL_CONTEXT "${ALHANGEUL_ASSOC_BACKUP_KEY}\.${EXT}" "State" 0
    ${Else}
      WriteRegStr SHELL_CONTEXT "${ALHANGEUL_ASSOC_BACKUP_KEY}\.${EXT}" "Default" "$R0"
      WriteRegDWORD SHELL_CONTEXT "${ALHANGEUL_ASSOC_BACKUP_KEY}\.${EXT}" "State" 1
    ${EndIf}
  ${EndIf}
  Pop $R1
  Pop $R0
!macroend

!macro ALHANGEUL_RESTORE_EXTENSION_DEFAULT EXT
  Push $R0
  Push $R1
  ClearErrors
  ReadRegDWORD $R1 SHELL_CONTEXT "${ALHANGEUL_ASSOC_BACKUP_KEY}\.${EXT}" "State"
  ${IfNot} ${Errors}
    ${If} $R1 = 1
      ClearErrors
      ReadRegStr $R0 SHELL_CONTEXT "${ALHANGEUL_ASSOC_BACKUP_KEY}\.${EXT}" "Default"
      ${IfNot} ${Errors}
        ClearErrors
        WriteRegStr SHELL_CONTEXT "Software\Classes\.${EXT}" "" "$R0"
        ${IfNot} ${Errors}
          DeleteRegKey SHELL_CONTEXT "${ALHANGEUL_ASSOC_BACKUP_KEY}\.${EXT}"
        ${EndIf}
      ${EndIf}
    ${ElseIf} $R1 = 0
      ClearErrors
      DeleteRegValue SHELL_CONTEXT "Software\Classes\.${EXT}" ""
      ClearErrors
      ReadRegStr $R0 SHELL_CONTEXT "Software\Classes\.${EXT}" ""
      ${If} ${Errors}
        DeleteRegKey SHELL_CONTEXT "${ALHANGEUL_ASSOC_BACKUP_KEY}\.${EXT}"
      ${EndIf}
    ${EndIf}
  ${EndIf}
  Pop $R1
  Pop $R0
!macroend

!macro ALHANGEUL_REGISTER_OPEN_WITH EXT PROGID
  WriteRegStr SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids" "${PROGID}" ""
!macroend

!macro ALHANGEUL_REMOVE_OPEN_WITH EXT PROGID
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids" "${PROGID}"
!macroend

!macro ALHANGEUL_REMOVE_EMPTY_EXTENSION_KEYS EXT
  DeleteRegKey /ifempty SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids"
  DeleteRegKey /ifempty SHELL_CONTEXT "Software\Classes\.${EXT}"
!macroend

!macro ALHANGEUL_REMOVE_EMPTY_BACKUP_KEYS
  DeleteRegKey /ifempty SHELL_CONTEXT "${ALHANGEUL_ASSOC_BACKUP_KEY}"
  DeleteRegKey /ifempty SHELL_CONTEXT "Software\Alhangeul"
!macroend

!macro NSIS_HOOK_PREINSTALL
  SetRegView 64
  !insertmacro ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT "hwp"
  !insertmacro ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT "hwpx"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  SetRegView 64
  !insertmacro ALHANGEUL_RESTORE_EXTENSION_DEFAULT "hwp"
  !insertmacro ALHANGEUL_RESTORE_EXTENSION_DEFAULT "hwpx"
  !insertmacro ALHANGEUL_INSTALL_THUMBNAIL
  !insertmacro ALHANGEUL_REGISTER_OPEN_WITH "hwp" "Alhangeul.hwp"
  !insertmacro ALHANGEUL_REGISTER_OPEN_WITH "hwpx" "Alhangeul.hwpx"
  !insertmacro ALHANGEUL_REMOVE_EMPTY_BACKUP_KEYS
  !insertmacro UPDATEFILEASSOC
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  SetRegView 64
  !insertmacro ALHANGEUL_UNINSTALL_THUMBNAIL
  !insertmacro ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT "hwp"
  !insertmacro ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT "hwpx"
  !insertmacro ALHANGEUL_REMOVE_OPEN_WITH "hwp" "Alhangeul.hwp"
  !insertmacro ALHANGEUL_REMOVE_OPEN_WITH "hwpx" "Alhangeul.hwpx"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  SetRegView 64
  !insertmacro ALHANGEUL_RESTORE_EXTENSION_DEFAULT "hwp"
  !insertmacro ALHANGEUL_RESTORE_EXTENSION_DEFAULT "hwpx"
  !insertmacro ALHANGEUL_REMOVE_EMPTY_EXTENSION_KEYS "hwp"
  !insertmacro ALHANGEUL_REMOVE_EMPTY_EXTENSION_KEYS "hwpx"
  !insertmacro ALHANGEUL_REMOVE_EMPTY_BACKUP_KEYS
  !insertmacro UPDATEFILEASSOC
!macroend
