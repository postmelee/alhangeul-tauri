; Shell may retain the handler briefly after a thumbnail request.
; Touch only the owned DLL; never terminate its host or schedule a reboot.
!macro ALHANGEUL_WAIT_THUMBNAIL_WRITABLE
  Push $R0
  Push $R1
  StrCpy $R1 0
  ${Do}
    ${IfNot} ${FileExists} "${ALHANGEUL_THUMBNAIL_HANDLER}"
      ${ExitDo}
    ${EndIf}
    ClearErrors
    FileOpen $R0 "${ALHANGEUL_THUMBNAIL_HANDLER}" a
    ${IfNot} ${Errors}
      FileClose $R0
      ${ExitDo}
    ${EndIf}
    ${If} $R1 >= 60
      Pop $R1
      Pop $R0
      SetErrorLevel 1603
      Abort "Alhangeul thumbnail handler is still in use. Close document preview windows and retry."
    ${EndIf}
    Sleep 1000
    IntOp $R1 $R1 + 1
  ${Loop}
  ClearErrors
  Pop $R1
  Pop $R0
!macroend

!macro ALHANGEUL_REMOVE_THUMBNAIL_RESIDUAL
  Push $R0
  StrCpy $R0 0
  ${Do}
    ${IfNot} ${FileExists} "${ALHANGEUL_THUMBNAIL_HANDLER}"
      ${ExitDo}
    ${EndIf}
    ClearErrors
    Delete "${ALHANGEUL_THUMBNAIL_HANDLER}"
    ${IfNot} ${FileExists} "${ALHANGEUL_THUMBNAIL_HANDLER}"
      ${ExitDo}
    ${EndIf}
    ${If} $R0 >= 60
      Pop $R0
      SetErrorLevel 1603
      Abort "Alhangeul thumbnail handler could not be removed. Close document preview windows and retry removal."
    ${EndIf}
    Sleep 1000
    IntOp $R0 $R0 + 1
  ${Loop}
  ; Preserve user-added files. Only an empty product directory may be removed.
  RMDir "$INSTDIR"
  ClearErrors
  Pop $R0
!macroend
