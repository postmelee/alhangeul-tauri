import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const out = join(process.cwd(), 'privacy-evidence');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pages = await fetch('http://127.0.0.1:9222/json/list').then(r => r.json());
const page = pages.find(p => p.type === 'page' && /tauri/.test(p.url));
if (!page) throw new Error('Alhangeul WebView CDP target unavailable');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
socket.onmessage = event => {
  const data = JSON.parse(event.data);
  if (!data.id) return;
  const call = pending.get(data.id);
  if (!call) return;
  pending.delete(data.id); clearTimeout(call.timer);
  if (data.error) call.reject(new Error(JSON.stringify(data.error)));
  else call.resolve(data.result);
};
function command(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timeout`)); }, 120000);
    pending.set(id, {resolve, reject, timer});
    socket.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
  return result.result.value;
}
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
    await writeFile(join(out,`synthetic.${extension}`),new Uint8Array(exported));
    const reopened = await evaluate(`privacyRpc('loadFile',{data:new Uint8Array(${JSON.stringify(exported)}),fileName:'TASK135-SYNTHETIC-DOCUMENT.${extension}',skipUnsavedGuard:true,suppressDialogs:true})`);
    await sleep(10000);
    results.push({format:extension,opened,reopened,renderChanged:true,exportBytes:exported.length,
      saveBoundary:'Studio export -> test harness filesystem; native save dialog not exercised'});
    const capture=await command('Page.captureScreenshot',{format:'png'});
    await writeFile(join(out,`document-${extension}.png`),Buffer.from(capture.data,'base64'));
  }
} finally {
  await writeFile(join(out,'document-results.json'),JSON.stringify(results,null,2));
  socket.close();
}
