Unicode true
RequestExecutionLevel user
SilentInstall silent
Name "Alhangeul cleanup regression"
OutFile "${OUTPUT_EXE}"
!include "LogicLib.nsh"
!define ALHANGEUL_THUMBNAIL_HANDLER "$INSTDIR\AlhangeulThumbnailHandler.dll"
!include "${HELPER_PATH}"
Section
  ReadEnvStr $INSTDIR ALHANGEUL_CLEANUP_FIXTURE
  ReadEnvStr $R9 ALHANGEUL_CLEANUP_MODE
  StrCpy $R0 "preserved-zero"
  StrCpy $R1 "preserved-one"
  ${If} $R9 == "wait"
    !insertmacro ALHANGEUL_WAIT_THUMBNAIL_WRITABLE
  ${ElseIf} $R9 == "remove"
    !insertmacro ALHANGEUL_REMOVE_THUMBNAIL_RESIDUAL
  ${Else}
    SetErrorLevel 99
    Quit
  ${EndIf}
  ${If} $R0 != "preserved-zero"
  ${OrIf} $R1 != "preserved-one"
    SetErrorLevel 98
    Quit
  ${EndIf}
  SetErrorLevel 0
SectionEnd
