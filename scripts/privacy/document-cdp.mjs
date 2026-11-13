import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const out = join(process.cwd(), 'privacy-evidence');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
import { connectCdp, connectWebDriver } from './document-transport.mjs';
const {evaluate, capture, close} = await (process.platform === 'win32' ? connectCdp() : connectWebDriver());
const hardDeadline=setTimeout(()=>{console.error('document scenario deadline');process.exit(1);},240000);
await evaluate(`window.privacyRpc = (method, params={}) => new Promise((resolve,reject) => {
  const id = 'privacy-' + Math.random();
  const timer = setTimeout(() => {window.removeEventListener('message', listener);reject(new Error(method+' timeout'));},90000);
  function listener(event) {
    if(event.source!==window || event.data?.type!=='rhwp-response' || event.data.id!==id)return;
    clearTimeout(timer);window.removeEventListener('message',listener);
    event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result);
  }
  window.addEventListener('message',listener);
  window.postMessage({type:'rhwp-request',id,method,params},'*');
})`);
const results = [];
try {
  const updater = await evaluate(`window.__TAURI_INTERNALS__.invoke('updater_get_state')`);
  await writeFile(join(out,'updater-state.json'), JSON.stringify(updater,null,2));
  for (const extension of ['hwp','hwpx']) {
    await writeFile(join(out,'phase'), `document-${extension}`);
    const bytes = [...await readFile(`tests/gui/local-fonts/abel.${extension}`)];
    const opened = await evaluate(`privacyRpc('loadFile',{data:new Uint8Array(${JSON.stringify(bytes)}),fileName:'TASK135-SYNTHETIC-DOCUMENT.${extension}',skipUnsavedGuard:true,suppressDialogs:true})`);
    const before = await evaluate(`privacyRpc('getPageSvg',{page:0})`);
    await evaluate(`(() => {
      const input=document.querySelector('textarea[aria-label="문서 편집 입력"]');
      if(!input)throw new Error('missing editor');
      input.focus();input.value='TASK135-SYNTHETIC-DOCUMENT';
      input.dispatchEvent(new InputEvent('input',{bubbles:true,data:input.value,inputType:'insertText'}));
    })()`);
    await sleep(3000);
    const after = await evaluate(`privacyRpc('getPageSvg',{page:0})`);
    if (before === after) throw new Error(`${extension} edit did not change rendered document`);
    const exported = await evaluate(`privacyRpc('${extension === 'hwp' ? 'exportHwp' : 'exportHwpx'}').then(x=>Array.from(x))`);
    if (!exported?.length) throw new Error('empty export');
    const targetPath=join(out,`synthetic.${extension}`);
    const session=await evaluate(`window.__TAURI_INTERNALS__.invoke('create_document')`);
    const stagedPath=await evaluate(`window.__TAURI_INTERNALS__.invoke('prepare_staged_document_save',${JSON.stringify({targetPath,format:extension})})`);
    await writeFile(stagedPath,new Uint8Array(exported));
    const saved=await evaluate(`window.__TAURI_INTERNALS__.invoke('commit_staged_document_save',${JSON.stringify({request:{docId:session.docId,stagedPath,targetPath,format:extension,expectedRevision:session.revision,allowExternalOverwrite:false}})})`);
    if (!(await readFile(targetPath)).equals(Buffer.from(exported))) throw new Error('saved bytes differ');
    await evaluate(`window.__TAURI_INTERNALS__.invoke('close_document',${JSON.stringify({docId:session.docId})})`);
    const reopened = await evaluate(`privacyRpc('loadFile',{data:new Uint8Array(${JSON.stringify(exported)}),fileName:'TASK135-SYNTHETIC-DOCUMENT.${extension}',skipUnsavedGuard:true,suppressDialogs:true})`);
    await sleep(10000);
    results.push({format:extension,opened,reopened,renderChanged:true,exportBytes:exported.length,
      nativeSaveVerified:!!saved,saveBoundary:'Studio export + native staged commit; file picker and frontend fs plugin omitted'});
    await writeFile(join(out,`document-${extension}.png`),await capture());
  }
} finally {
  await writeFile(join(out,'document-results.json'),JSON.stringify(results,null,2));
  clearTimeout(hardDeadline);
  await close();
}
