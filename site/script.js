const siteRoot = document.body.dataset.siteRoot ?? './';
if (typeof packageDownloads !== 'undefined') packageDownloads.renderLists();

setupDownloadPanel();
setupPlatformPreference();
setupReleaseData();
setupCopyButtons();

function setupPlatformPreference() {
    const radios = [...document.querySelectorAll('input[name="download-platform"]')];
    if (radios.length === 0) return;
    const userAgent = navigator.userAgent ?? '';
    if (/Linux/i.test(userAgent) && !/Android/i.test(userAgent)) {
        const linux = document.querySelector('#download-platform-linux');
        if (linux) linux.checked = true;
    }
    const updatePanels = () => {
        const selected = radios.find(radio => radio.checked)?.value ?? 'windows';
        for (const panel of document.querySelectorAll('[data-download-platform-panel]')) {
            panel.hidden = panel.dataset.downloadPlatformPanel !== selected;
            if (panel.hidden && panel.contains(document.activeElement)) radios.find(radio => radio.checked)?.focus();
        }
    };
    updatePanels();
    for (const [index, radio] of radios.entries()) {
        radio.addEventListener('change', updatePanels);
        radio.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
            const next = radios[(index + step + radios.length) % radios.length];
            next.checked = true;
            next.focus();
            next.dispatchEvent(new Event('change', { bubbles: true }));
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
            message.textContent = `최신 버전 v${release.version}`;
        }

        hydrateReleaseNote(release);
        hydrateVersionStatus(release);
        if (typeof packageDownloads === 'undefined' || !document.querySelector('[data-package-platform]')) return;
        const downloads = await fetch(`${siteRoot}downloads.json`, { cache: 'no-store' });
        if (downloads.ok) packageDownloads.activate(await downloads.json(), release);
    } catch {
        // 원문 목록이 없거나 혼합되면 GitHub Releases 안내 링크를 유지한다.
    }
}

function hydrateReleaseNote(release) {
    const placeholder = document.querySelector('[data-release-note]');
    if (!placeholder) return;
    const local = document.querySelector(`[data-release-note-version="${release.version}"]`);
    if (local) {
        placeholder.remove();
        addLatestBadge(local);
        return;
    }
    const link = document.createElement('a');
    link.href = `https://github.com/postmelee/alhangeul-tauri/releases/tag/${release.tag}`;
    const title = document.createElement('span');
    title.className = 'release-entry-title';
    title.textContent = `알한글 v${release.version}`;
    const summary = document.createElement('span');
    summary.className = 'release-entry-summary';
    summary.textContent = '최신 안정 릴리즈의 변경 내용을 GitHub Releases에서 확인하세요.';
    link.append(title, summary);
    addLatestBadge(link);
    placeholder.replaceWith(link);
}

function hydrateVersionStatus(release) {
    const version = document.body.dataset.releaseVersion;
    const message = document.querySelector('[data-version-status]');
    if (!message || !version || document.body.dataset.releaseStatus !== 'published') return;
    message.textContent = version === release.version
        ? '사이트의 최신 버전입니다.'
        : `이 안내는 v${version}입니다. 사이트의 최신 버전은 ${release.tag}입니다. 최신 버전 다운로드에서 확인하세요.`;
    message.hidden = false;
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
        && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release.version)
        && release.tag === `v${release.version}`
        && release.downloads
        && typeof release.downloads === 'object';
}

function addLatestBadge(link) {
    if (link.querySelector('.latest-badge')) return;
    const badge = document.createElement('span');
    badge.className = 'latest-badge';
    badge.textContent = '최신 버전';
    const title = link.querySelector('.release-entry-title');
    if (title) title.append(badge);
    else link.append(badge);
}

function setupDownloadPanel() {
    const button = document.querySelector('[data-download-toggle]');
    const panel = document.querySelector('#download-panel');
    if (!button || !panel) return;
    const setOpen = open => {
        if (!open && panel.contains(document.activeElement)) button.focus();
        panel.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
    };
    button.addEventListener('click', () => setOpen(panel.hidden));
    const openFromHash = () => {
        if (window.location.hash === '#latest-download') setOpen(true);
    };
    window.addEventListener('hashchange', openFromHash);
    openFromHash();
}
