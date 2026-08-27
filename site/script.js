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
            message.textContent = `알한글 ${release.version} 안정 릴리스가 준비되었습니다.`;
        }
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
        // 공개 전 기본 안내를 유지한다.
    }
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
