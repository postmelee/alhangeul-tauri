export async function connectCdp() {
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

return {evaluate,capture:async()=>Buffer.from((await command('Page.captureScreenshot',{format:'png'})).data,'base64'),close:async()=>socket.close()};
}

export async function connectWebDriver() {
  const base='http://127.0.0.1:4444';
  async function request(path,body,method='POST') {
    const response=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
    const result=await response.json();
    if(!response.ok || result.value?.error) throw new Error(JSON.stringify(result.value));
    return result.value;
  }
  const session=await request('/session',{capabilities:{alwaysMatch:{'tauri:options':{application:process.env.PRIVACY_APP},browserName:'wry'}}});
  const prefix='/session/'+session.sessionId;
  await request(prefix+'/timeouts',{script:120000});
  return {
    evaluate:async(expression)=>{
      const result=await request(prefix+'/execute/async',{script:'const done=arguments[arguments.length-1];Promise.resolve().then(()=>eval(arguments[0])).then(value=>done({ok:true,value}),error=>done({ok:false,error:String(error)}));',args:[expression]});
      if(!result.ok)throw new Error(result.error);
      return result.value;
    },
    capture:async()=>Buffer.from(await request(prefix+'/screenshot',undefined,'GET'),'base64'),
    close:async()=>request(prefix,undefined,'DELETE')
  };
}
