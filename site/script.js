const siteRoot = document.body.dataset.siteRoot ?? './';

setupReleaseData();
setupCopyButtons();

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
    link.setAttribute('aria-label', `${link.textContent.trim()} · 알한글 ${release.version} 다운로드`);
    const state = link.querySelector('[data-download-state]');
    if (state) state.textContent = `${state.textContent.split(' · ')[0]} · ${release.version} 다운로드`;
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
            && url.pathname.startsWith(`/postmelee/alhangeul-tauri/releases/download/${tag}/`);
    } catch {
        return false;
    }
}
