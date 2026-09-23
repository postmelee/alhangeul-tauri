# Loaded by the native diagnostics suite; real, hidden HWNDs, not product/file I/O.
# Test-Case and Assert-Equal are supplied by that suite.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public sealed class PdfFilenameFixture : IDisposable {
  [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern IntPtr CreateWindowEx(uint ex, string cls, string title, uint style,
    int x, int y, int width, int height, IntPtr parent, IntPtr menu, IntPtr instance, IntPtr param);
  [DllImport("user32.dll")] static extern bool DestroyWindow(IntPtr window);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern bool SetWindowText(IntPtr window, string text);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern int GetWindowTextLength(IntPtr window);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern int GetWindowText(IntPtr window, StringBuilder text, int capacity);
  public IntPtr Dialog { get; private set; }
  public IntPtr Edit { get; private set; }
  public PdfFilenameFixture(int id) {
    try {
      Dialog = CreateWindowEx(0, "#32770", "", 0, 0, 0, 320, 100,
        IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
      if (Dialog == IntPtr.Zero) throw new Exception("Fixture dialog creation failed");
      Edit = CreateWindowEx(0, "Edit", "", 0x40000000, 0, 0, 300, 30,
        Dialog, new IntPtr(id), IntPtr.Zero, IntPtr.Zero);
      if (Edit == IntPtr.Zero) throw new Exception("Fixture edit creation failed");
    } catch { Dispose(); throw; }
  }
  public void Seed(string text) {
    if (!SetWindowText(Edit, text)) throw new Exception("Fixture seed failed");
  }
  public string Read() {
    var text = new StringBuilder(GetWindowTextLength(Edit) + 1);
    GetWindowText(Edit, text, text.Capacity);
    return text.ToString();
  }
  public void Dispose() {
    // Destroying this owned parent also destroys its child; never enumerate other HWNDs.
    if (Dialog != IntPtr.Zero && !DestroyWindow(Dialog)) throw new Exception("Fixture cleanup failed");
    Dialog = IntPtr.Zero;
    Edit = IntPtr.Zero;
  }
}
'@

# Use the exact private readback used by SetFileName, without rewriting its logic.
$verifyReadback = [PdfDialogNative].GetMethod('VerifyFileName', [Reflection.BindingFlags]'NonPublic, Static')
if ($null -eq $verifyReadback) { throw 'Missing production helper readback.' }
# ASCII source remains readable by Windows PowerShell 5.1 without a BOM.
$koreanPath = "C:\$([char]0xAC80)$([char]0xC99D)\$([char]0xD55C)$([char]0xAE00).pdf"
foreach ($mode in @('Open', 'Save')) {
  foreach ($entry in @(@{ name = 'ASCII'; text = 'C:\fixture\export.pdf' },
      @{ name = 'Korean'; text = $koreanPath })) {
    Test-Case "native filename setter accepts exact $($entry.name) path in $mode" {
      $id = if ($mode -ceq 'Open') { 1148 } else { 1001 }
      $fixture = [PdfFilenameFixture]::new($id)
      try {
        $fixture.Seed('previous-long-filename-that-must-be-replaced.pdf')
        [PdfDialogNative]::SetFileName($fixture.Dialog, $fixture.Edit, [uint32]$PID, $entry.text, $mode)
        Assert-Equal ($fixture.Read()) $entry.text
      } finally { $fixture.Dispose() }
    }
  }
}

$expectedFilename = 'C:\fixture\export.pdf'
$readbackNegatives = @(
  @{ name = 'one extra character'; actual = $expectedFilename + 'X' },
  @{ name = 'long suffix'; actual = $expectedFilename + ('X' * 1024) },
  @{ name = 'Korean suffix'; actual = $expectedFilename + [char]0xAC00 },
  @{ name = 'shorter value'; actual = $expectedFilename.Substring(0, $expectedFilename.Length - 1) },
  @{ name = 'same-length mismatch'; actual = 'C:\fixture\export.pdx' }
)
foreach ($entry in $readbackNegatives) {
  Test-Case "native filename readback rejects $($entry.name)" {
    $fixture = [PdfFilenameFixture]::new(1001)
    try {
      $fixture.Seed($entry.actual)
      Assert-Equal ($fixture.Read()) $entry.actual
      $rejection = $null
      try { $null = $verifyReadback.Invoke($null, [object[]]@($fixture.Edit, $expectedFilename)) }
      catch { $rejection = $_.Exception.GetBaseException().Message }
      Assert-Equal $rejection 'Filename readback mismatch'
    } finally { $fixture.Dispose() }
  }
}
