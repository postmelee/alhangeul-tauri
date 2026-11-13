import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { connectCdp, connectWebDriver } from './document-transport.mjs';

const label = process.argv[2];
assert.ok(['nsis', 'msi', 'appimage'].includes(label));
const manifest = JSON.parse(await readFile('product-source/assets/fonts/licenses/font-notices.json', 'utf8'));
const fonts = manifest.fonts.filter((row) => /^Nanum.*-Regular\.woff2$/.test(row.file));
assert.equal(fonts.length, 3);
let transport;
for (let attempt = 0; attempt < 30; attempt++) {
  try { transport = await (process.platform === 'win32' ? connectCdp() : connectWebDriver()); break; }
  catch (error) { if (attempt === 29) throw error; await new Promise((resolve) => setTimeout(resolve, 1000)); }
}
const results = [];
try {
  await transport.evaluate(`(() => {
    document.querySelector('.privacy-notice-dialog .dialog-footer button')?.click();
    const panel=document.createElement('div');panel.id='task135-font-observation';
    panel.style.cssText='position:fixed;inset:0;z-index:2147483647;background:white;color:black;padding:40px;overflow:auto;box-sizing:border-box';
    panel.innerHTML='<h1>Alhangeul bundled font observation</h1><p>Synthetic test text, rendered from this installed application.</p>';
    document.body.append(panel);
  })()`);
  for (const [index, font] of fonts.entries()) {
    const bytes = await transport.evaluate(`(async () => {
      const response=await fetch(new URL('fonts/'+${JSON.stringify(font.file)},location.href));
      if(!response.ok)throw new Error('Bundled font unavailable');
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength>2000000)throw new Error('Unexpected font size');
      const family='Task135Font${index}';const face=new FontFace(family,bytes);await face.load();document.fonts.add(face);
      const panel=document.querySelector('#task135-font-observation');
      const heading=document.createElement('h2');heading.style.cssText='font-size:18px;margin:14px 0 6px';heading.textContent=${JSON.stringify(font.file)};panel.append(heading);
      const sample=document.createElement('p');sample.style.fontFamily=family;sample.style.fontSize='24px';sample.style.lineHeight='1.4';sample.style.whiteSpace='pre-line';sample.style.margin='0 0 16px';
      sample.textContent=${JSON.stringify('가나다라마바사 한글 문서 · 훈민정음\nAlhangeul ABC xyz 0123456789')};panel.append(sample);
      await document.fonts.ready;
      const bounds=sample.getBoundingClientRect();
      if(face.status!=='loaded' || bounds.height<20 || bounds.bottom>innerHeight-20)throw new Error('Font sample not fully visible');
      return Array.from(new Uint8Array(bytes));
    })()`);
    const sha256 = createHash('sha256').update(Buffer.from(bytes)).digest('hex');
    assert.equal(sha256, font.sha256, `Installed font differs: ${font.file}`);
    results.push({ file: font.file, sha256, loaded: true });
  }
  await writeFile(`privacy-evidence/${label}-bundled-fonts.png`, await transport.capture());
  await writeFile(`privacy-evidence/${label}-bundled-fonts.json`, `${JSON.stringify({ scope: 'Actual installed WebView FontFace loading and synthetic text; not document-layout equivalence.', fonts: results }, null, 2)}\n`);
} finally {
  await transport.evaluate(`document.querySelector('#task135-font-observation')?.remove()`).catch(() => {});
  await transport.close();
}
