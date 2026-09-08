/** Exact identity at the UI boundary; generic "open complete" is not identity. */
export function assertDocumentIdentity(title: string, expectedName: string): void {
  if (!expectedName || /[\\/\r\n\0]/.test(expectedName)
      || title !== `${expectedName} - Alhangeul`) {
    throw new Error('Opened document identity mismatch');
  }
}
