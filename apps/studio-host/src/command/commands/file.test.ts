import { describe, expect, it } from 'vitest';
import {
  confirmSaveBeforeReplacingDocument as upstreamConfirmSave,
  fileCommands as upstreamFileCommands,
} from '@upstream/command/commands/file';
import {
  confirmSaveBeforeReplacingDocument,
  fileCommands,
} from './file';

describe('Stage 2 file command boundary', () => {
  it('inherits the complete upstream file command set unchanged', () => {
    expect(fileCommands).toBe(upstreamFileCommands);
    expect(confirmSaveBeforeReplacingDocument).toBe(upstreamConfirmSave);
  });
});
