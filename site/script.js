const root = document.documentElement;
const featureButtons = [...document.querySelectorAll('[data-feature-src]')];
const featureImage = document.querySelector('[data-feature-image]');
const featureCaption = document.querySelector('[data-feature-caption]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

root.classList.add('js');
setupFeatureSwitch();
setupReleaseData();
setupReveal();

function setupFeatureSwitch() {
    if (!featureImage || !featureCaption) return;
    featureButtons.forEach((button, index) => {
        button.addEventListener('click', () => selectFeature(button));
        button.addEventListener('keydown', (event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const targetIndex = event.key === 'Home'
                ? 0
                : event.key === 'End'
                    ? featureButtons.length - 1
                    : (index + (event.key === 'ArrowDown' ? 1 : -1) + featureButtons.length)
                        % featureButtons.length;
            featureButtons[targetIndex].focus();
            selectFeature(featureButtons[targetIndex]);
        });
    });
}

function selectFeature(selected) {
    if (selected.getAttribute('aria-pressed') === 'true') return;
    featureButtons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button === selected));
    });
    const update = () => {
        featureImage.src = selected.dataset.featureSrc;
        featureImage.alt = selected.dataset.featureAlt;
        featureCaption.textContent = selected.dataset.featureCaption;
        featureImage.classList.remove('is-switching');
    };
    if (reduceMotion.matches) update();
    else {
        featureImage.classList.add('is-switching');
        window.setTimeout(update, 90);
    }
}

async function setupReleaseData() {
    try {
        const response = await fetch('release.json', { cache: 'no-store' });
        if (!response.ok) return;
        const release = await response.json();
        if (!isPublishedRelease(release)) return;
        const message = document.querySelector('[data-release-message]');
        if (message) message.textContent = `알한글 ${release.version} 안정 릴리스가 준비되었습니다.`;
        for (const action of document.querySelectorAll('[data-download-target]')) {
            const url = release.downloads[action.dataset.downloadTarget];
            if (!isExactDownload(url, release.tag)) continue;
            const link = document.createElement('a');
            link.className = action.className;
            link.dataset.downloadTarget = action.dataset.downloadTarget;
            link.href = url;
            link.textContent = `${release.version} 다운로드`;
            action.replaceWith(link);
        }
    } catch {
        // 기본 unpublished 안내를 유지한다.
    }
}

function isPublishedRelease(release) {
    return release?.status === 'published'
        && /^\d+\.\d+\.\d+$/.test(release.version)
        && release.tag === `v${release.version}`
        && release.updater?.manifestPublished === false
        && release.downloads
        && typeof release.downloads === 'object';
}

function isExactDownload(value, tag) {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && url.hostname === 'github.com'
            && !url.search
            && !url.hash
            && url.pathname.startsWith(
                `/postmelee/alhangeul-tauri/releases/download/${tag}/`,
            );
    } catch {
        return false;
    }
}

function setupReveal() {
    const items = [...document.querySelectorAll('[data-reveal]')];
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
        items.forEach((item) => item.classList.add('is-visible'));
        return;
    }
    root.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((item, index) => {
        item.style.setProperty('--reveal-delay', `${Math.min(index % 3, 2) * 80}ms`);
        observer.observe(item);
    });
}
