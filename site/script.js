const siteRoot = document.body.dataset.siteRoot ?? './';
const downloadTargetLabels = Object.freeze({
    'windows-x86_64-nsis': 'Windows x64 NSIS',
    'windows-x86_64-msi': 'Windows x64 MSI',
    'linux-x86_64-appimage': 'Linux x64 AppImage',
});

setupPlatformPreference();
setupReleaseData();
setupCopyButtons();

function setupPlatformPreference() {
    const radios = [...document.querySelectorAll('input[name="download-platform"]')];
    if (radios.length === 0) return;
    if (/Linux/i.test(navigator.userAgent ?? '')) {
        const linux = document.querySelector('#download-platform-linux');
        if (linux) linux.checked = true;
    }
    for (const [index, radio] of radios.entries()) {
        radio.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
            const next = radios[(index + step + radios.length) % radios.length];
            next.checked = true;
            next.focus();
        });
    }
}

async function setupReleaseData() {
    try {
        const response = await fetch(`${siteRoot}release.json`, { cache: 'no-store' });
        if (!response.ok) return;
        const release = await response.json();
        if (!isPublishedRelease(release)) return;

        for (const message of document.querySelectorAll('[data-release-message]')) {
            message.textContent = `알한글 ${release.version} 안정 릴리스가 준비되었습니다. Windows는 NSIS·MSI, Linux x64는 AppImage를 직접 받을 수 있습니다.`;
        }
        for (const action of document.querySelectorAll('[data-download-target]')) {
            const url = release.downloads[action.dataset.downloadTarget];
            if (!isExactDownload(url, release.tag)) continue;
            hydrateDownloadAction(action, url, release);
        }
        hydrateReleaseNote(release);
    } catch {
        // 공개 전 기본 안내와 최신 다운로드 안내 링크를 유지한다.
    }
}

function hydrateDownloadAction(action, url, release) {
    let link = action;
    if (action.tagName !== 'A') {
        link = document.createElement('a');
        link.className = action.className;
        link.dataset.downloadTarget = action.dataset.downloadTarget;
        link.innerHTML = action.innerHTML;
        action.replaceWith(link);
    }
    link.href = url;
    link.removeAttribute('aria-disabled');
    link.dataset.downloadReady = 'true';
    const state = link.querySelector('[data-download-state]');
    if (state?.dataset.downloadState === 'home') state.textContent = '다운로드';
    else if (state) state.textContent = `${state.textContent.split(' · ')[0]} · ${release.version} 다운로드`;
    const targetLabel = downloadTargetLabels[link.dataset.downloadTarget] ?? link.textContent.trim();
    link.setAttribute('aria-label', `${targetLabel} · 알한글 ${release.version} 다운로드`);
}

function hydrateReleaseNote(release) {
    const placeholder = document.querySelector('[data-release-note]');
    if (!placeholder) return;
    const link = document.createElement('a');
    link.href = `https://github.com/postmelee/alhangeul-tauri/releases/tag/${release.tag}`;
    const title = document.createElement('strong');
    title.textContent = `알한글 v${release.version}`;
    const summary = document.createElement('span');
    summary.textContent = '최신 안정 릴리즈의 변경 내용을 GitHub Releases에서 확인하세요.';
    link.append(title, summary);
    placeholder.replaceWith(link);
}

function setupCopyButtons() {
    for (const button of document.querySelectorAll('[data-copy-value]')) {
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(button.dataset.copyValue);
                button.textContent = '복사됨';
                window.setTimeout(() => { button.textContent = '복사'; }, 1200);
            } catch {
                button.textContent = '직접 복사해 주세요';
            }
        });
    }
}

function isPublishedRelease(release) {
    return release?.status === 'published'
        && /^\d+\.\d+\.\d+$/.test(release.version)
        && release.tag === `v${release.version}`
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
            && url.pathname.startsWith(`/postmelee/alhangeul-tauri/releases/download/${tag}/`);
    } catch {
        return false;
    }
}
