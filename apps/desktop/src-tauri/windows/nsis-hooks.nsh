!macro ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT EXT PROGID
  ClearErrors
  ReadRegStr $R0 SHELL_CONTEXT "Software\Classes\.${EXT}" ""
  ${If} ${Errors}
    WriteRegDWORD SHELL_CONTEXT "Software\Classes\.${EXT}" "${PROGID}_default_present" 0
    WriteRegStr SHELL_CONTEXT "Software\Classes\.${EXT}" "${PROGID}_backup" ""
  ${Else}
    WriteRegDWORD SHELL_CONTEXT "Software\Classes\.${EXT}" "${PROGID}_default_present" 1
    WriteRegStr SHELL_CONTEXT "Software\Classes\.${EXT}" "${PROGID}_default_value" "$R0"
    WriteRegStr SHELL_CONTEXT "Software\Classes\.${EXT}" "${PROGID}_backup" "$R0"
  ${EndIf}
!macroend

!macro ALHANGEUL_RESTORE_EXTENSION_DEFAULT EXT PROGID
  ReadRegDWORD $R1 SHELL_CONTEXT "Software\Classes\.${EXT}" "${PROGID}_default_present"
  ${If} $R1 = 1
    ReadRegStr $R0 SHELL_CONTEXT "Software\Classes\.${EXT}" "${PROGID}_default_value"
    WriteRegStr SHELL_CONTEXT "Software\Classes\.${EXT}" "" "$R0"
  ${Else}
    DeleteRegValue SHELL_CONTEXT "Software\Classes\.${EXT}" ""
  ${EndIf}
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.${EXT}" "${PROGID}_default_present"
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.${EXT}" "${PROGID}_default_value"
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.${EXT}" "${PROGID}_backup"
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

!macro NSIS_HOOK_PREINSTALL
  !insertmacro ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT "hwp" "Alhangeul.hwp"
  !insertmacro ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT "hwpx" "Alhangeul.hwpx"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  !insertmacro ALHANGEUL_RESTORE_EXTENSION_DEFAULT "hwp" "Alhangeul.hwp"
  !insertmacro ALHANGEUL_RESTORE_EXTENSION_DEFAULT "hwpx" "Alhangeul.hwpx"
  !insertmacro ALHANGEUL_REGISTER_OPEN_WITH "hwp" "Alhangeul.hwp"
  !insertmacro ALHANGEUL_REGISTER_OPEN_WITH "hwpx" "Alhangeul.hwpx"
  !insertmacro UPDATEFILEASSOC
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT "hwp" "Alhangeul.hwp"
  !insertmacro ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT "hwpx" "Alhangeul.hwpx"
  !insertmacro ALHANGEUL_REMOVE_OPEN_WITH "hwp" "Alhangeul.hwp"
  !insertmacro ALHANGEUL_REMOVE_OPEN_WITH "hwpx" "Alhangeul.hwpx"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  !insertmacro ALHANGEUL_RESTORE_EXTENSION_DEFAULT "hwp" "Alhangeul.hwp"
  !insertmacro ALHANGEUL_RESTORE_EXTENSION_DEFAULT "hwpx" "Alhangeul.hwpx"
  !insertmacro ALHANGEUL_REMOVE_EMPTY_EXTENSION_KEYS "hwp"
  !insertmacro ALHANGEUL_REMOVE_EMPTY_EXTENSION_KEYS "hwpx"
  !insertmacro UPDATEFILEASSOC
!macroend
