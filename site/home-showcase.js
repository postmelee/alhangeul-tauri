// One OS selection controls both downloads and the real screenshot pair.
const productPairs = [...document.querySelectorAll('[data-product-platform]')];
const platformInputs = [...document.querySelectorAll('input[name="download-platform"]')];
function showSelectedPlatform() {
    const selected = platformInputs.find(input => input.checked)?.value ?? 'windows';
    for (const pair of productPairs) pair.hidden = pair.dataset.productPlatform !== selected;
}
for (const input of platformInputs) input.addEventListener('change', showSelectedPlatform);
showSelectedPlatform();

for (const pair of productPairs) {
    const stack = pair.querySelector('.product-stack');
    const controls = [...pair.querySelectorAll('[data-shot], [data-view]')];
    function bringForward(view) {
        pair.dataset.front = view;
        for (const control of controls) {
            control.setAttribute('aria-pressed', String((control.dataset.shot ?? control.dataset.view) === view));
        }
    }
    for (const control of controls) {
        const view = control.dataset.shot ?? control.dataset.view;
        control.addEventListener('click', () => bringForward(view));
        control.addEventListener('focus', () => bringForward(view));
    }
    // Stable exposed edges avoid a hover loop when stacking order changes under the pointer.
    stack.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || !matchMedia('(hover: hover)').matches) return;
        const bounds = stack.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        if (y < 0.13 || x > 0.92) bringForward('explorer');
        else if (x < 0.08 || y > 0.88) bringForward('editor');
    });
}
