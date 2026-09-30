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
    // Use the browser's hit target so only visible image pixels trigger a switch.
    stack.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || !matchMedia('(hover: hover)').matches) return;
        const shot = event.target.closest('[data-shot]');
        if (shot && stack.contains(shot)) bringForward(shot.dataset.shot);
    });
}
