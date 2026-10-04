import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = `${await readFile(new URL('../site/package-downloads.js', import.meta.url), 'utf8')}\n${await readFile(new URL('../site/script.js', import.meta.url), 'utf8')}`;
function element(tagName = 'DIV') {
  return { tagName, dataset: {}, children: [], attributes: {}, textContent: '',
    append(...items) { this.children.push(...items); },
    setAttribute(key, value) { this.attributes[key] = value; },
  };
}
function context(lists = [], fetch = async () => ({ok:false})) {
  return { URL, navigator: {}, window: {}, fetch, document: {
    body: {dataset: {}}, createElement: tag => element(tag.toUpperCase()),
    querySelector: () => null,
    querySelectorAll: selector => selector === '[data-package-platform]' ? lists : [],
  } };
}
test('홈은 공통 6종 정의에서 Windows 2행·Linux 4행을 표시한다', () => {
  const lists = ['windows', 'linux'].map(platform => {
    const list = element(); list.dataset.packagePlatform = platform; return list;
  });
  runInNewContext(source, context(lists));
  assert.equal(lists[0].children.length, 2);
  assert.equal(lists[1].children.length, 4);
  const links = lists.flatMap(list => list.children.map(row => row.children[1]));
  assert.equal(new Set(links.map(link => link.dataset.downloadTarget)).size, 6);
  assert.equal(lists[1].children[3].children[0].children[0].textContent, 'DEB arm64');
});
test('미공개 또는 잘못된 버전이면 공개 릴리즈 안내를 만들지 않는다', async () => {
  for (const release of [null, {status:'unreleased'}, {status:'published',version:'bad',tag:'vbad'}]) {
    const ctx = context([], async () => ({ok:true,json:async()=>release}));
    const message = {textContent:'첫 공개 릴리스를 준비하고 있습니다.'};
    ctx.document.querySelectorAll = selector => selector === '[data-release-message]' ? [message] : [];
    runInNewContext(source, ctx);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(message.textContent, '첫 공개 릴리스를 준비하고 있습니다.');
  }
});

test('이미지 전환은 실제 hit 대상에 반응하고 빈 공간·touch 이동에는 유지된다', async () => {
  const script = await readFile(new URL('../site/home-showcase.js', import.meta.url), 'utf8');
  const control = dataset => ({dataset, handlers:{}, setAttribute(k,v){this[k]=v;}, addEventListener(k,v){this.handlers[k]=v;}});
  const pairs = ['windows','linux'].map(os => {
    const controls = ['editor','explorer'].map(view => control({view}));
    const stack = {...control({}), contains: shot => controls.includes(shot)};
    controls.forEach(item => { item.dataset.shot = item.dataset.view; });
    return {dataset:{productPlatform:os,front:'editor'},controls,stack,
      querySelector:()=>stack,querySelectorAll:()=>controls};
  });
  const inputs = ['windows','linux'].map((value,i)=>({...control({}),value,checked:i===0}));
  runInNewContext(script,{document:{querySelectorAll:s=>s==='[data-product-platform]'?pairs:inputs},matchMedia:()=>({matches:true})});
  assert.equal(pairs[0].hidden,false); assert.equal(pairs[1].hidden,true);
  inputs[0].checked=false;inputs[1].checked=true;inputs[1].handlers.change();
  assert.equal(pairs[0].hidden,true);assert.equal(pairs[1].hidden,false);
  const pair=pairs[1];pair.controls[1].handlers.click();assert.equal(pair.dataset.front,'explorer');
  const move = (pointerType, shot) => pair.stack.handlers.pointermove({
    pointerType, target: {closest:()=>shot},
  });
  move('mouse', null); // Empty space must not switch either image.
  assert.equal(pair.dataset.front,'explorer');
  move('touch', pair.controls[0]);
  assert.equal(pair.dataset.front,'explorer');
  move('mouse', pair.controls[0]);
  assert.equal(pair.dataset.front,'editor');
  move('mouse', pair.controls[1]); // Exposed explorer image, regardless of its coordinates.
  assert.equal(pair.dataset.front,'explorer');
  move('mouse', pair.controls[1]); // No alternating state after stacking changes.
  assert.equal(pair.dataset.front,'explorer');
  move('mouse', {dataset:{shot:'editor'}}); // An unrelated element is ignored.
  assert.equal(pair.dataset.front,'explorer');
  pair.controls[1].handlers.focus();assert.equal(pair.controls[1]['aria-pressed'],'true');
});
