export function selectConfirmationCases(scenario: string, selection: string) {
  if (selection !== 'all' && selection !== 'confirm-only') throw new Error('Invalid PDF_CONFIRMATION_CASES');
  if (selection === 'confirm-only' && scenario !== 'confirmation-verify') {
    throw new Error('Confirm-only requires confirmation-verify');
  }
  return selection === 'confirm-only' ? ['Confirm'] as const : ['Decline', 'WrongTarget', 'Confirm'] as const;
}
