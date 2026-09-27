import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { transformLocalFontEntry } from '../../local-font-entry-hooks';

const main = readFileSync(resolve(__dirname, '../../../../third_party/rhwp/rhwp-studio/src/main.ts'), 'utf8');

describe('pinned local-font entry hooks', () => {
  it('adds only the two hooks and keeps the original browser function bodies', () => {
    const result = transformLocalFontEntry(main, '/product/core/local-font-controller.ts');
    expect(result).toContain('if (await __alhangeulPromptFonts()) return;');
    expect(result.indexOf('await __alhangeulPrepareFonts({')).toBeLessThan(
      result.indexOf("console.log('[initDoc] 1. 폰트 로딩 시작')"),
    );
    expect(result).toContain('session?.invalidateDocument();');
    expect(result).toContain('await view?.loadDocument();');
    const code = ts.transpileModule(result, { reportDiagnostics: true, compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    } });
    expect(code.diagnostics).toEqual([]);
    const originalAst = ts.createSourceFile('upstream.ts', main, ts.ScriptTarget.Latest, true);
    const originalPrompt = originalAst.statements.find((node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === 'promptLocalFontsIfNeeded');
    expect(result).toContain(originalPrompt!.body!.getText(originalAst).slice(1, -1));
    const hook = result.slice(result.indexOf('await __alhangeulPrepareFonts({'), result.indexOf("console.log('[initDoc] 1. 폰트 로딩 시작')"));
    expect(hook).not.toContain('documentState');
  });

  it('returns from the real upstream prompt before browser font logic in Tauri', async () => {
    const result = transformLocalFontEntry(main, '/controller.ts');
    const ast = ts.createSourceFile('main.ts', result, ts.ScriptTarget.Latest, true);
    const prompt = ast.statements.find((node) => ts.isFunctionDeclaration(node)
      && node.name?.text === 'promptLocalFontsIfNeeded')!;
    const code = ts.transpileModule(prompt.getText(ast), { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    } }).outputText;
    const run = new Function('__alhangeulPromptFonts', `${code}; return promptLocalFontsIfNeeded;`);
    await expect(run(async () => true)({ fontsUsed: ['Local Test'] }, 'test.hwp')).resolves.toBeUndefined();
    await expect(run(async () => false)({ fontsUsed: [] }, 'test.hwp')).resolves.toBeUndefined();
  });

  it('rejects missing, duplicate and already transformed entry markers', () => {
    expect(() => transformLocalFontEntry(main.replace('async function initializeDocument(', 'async function changed('), '/controller.ts')).toThrow('marker mismatch');
    expect(() => transformLocalFontEntry(`${main}\n${main}`, '/controller.ts')).toThrow('marker mismatch');
    expect(() => transformLocalFontEntry(transformLocalFontEntry(main, '/controller.ts'), '/controller.ts')).toThrow('duplicate');
  });
});
