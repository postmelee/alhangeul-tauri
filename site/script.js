const siteRoot = document.body.dataset.siteRoot ?? './';
// Add distribution formats here; home download rows share this catalog.
const distributionChannels = [
    { platform: 'windows', label: 'Windows', architecture: 'x64', formats: [
        { name: 'NSIS', target: 'windows-x86_64-nsis', description: '일반 설치 권장' },
        { name: 'MSI', target: 'windows-x86_64-msi', description: '조직·관리 배포' },
    ] },
    { platform: 'linux', label: 'Linux', architecture: 'x64', formats: [
        { name: 'AppImage', target: 'linux-x86_64-appimage', description: '자동 업데이트 권장' },
        { name: 'DEB/RPM', description: '배포판 패키지' },
    ] },
    { platform: 'linux', label: 'Linux', architecture: 'arm64', formats: [
        { name: 'DEB', description: '수동 설치' },
    ] },
];
const downloadTargetLabels = Object.fromEntries(distributionChannels.flatMap(channel =>
    channel.formats.filter(format => format.target).map(format =>
        [format.target, `${channel.label} ${channel.architecture} ${format.name}`])));

renderPackageLists();

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
        for (const action of document.querySelectorAll('[data-download-target]')) {
            const url = release.downloads[action.dataset.downloadTarget];
            if (!isExactDownload(url, release.tag)) continue;
            hydrateDownloadAction(action, url, release);
        }
        for (const note of document.querySelectorAll('[data-install-note]')) {
            note.textContent = '설치 방식별 안내와 변경 내용은 업데이트 페이지에서 확인하세요.';
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

function renderPackageLists() {
    for (const list of document.querySelectorAll('[data-package-platform]')) {
        for (const channel of distributionChannels.filter(item => item.platform === list.dataset.packagePlatform)) {
            for (const format of channel.formats) {
                const row = document.createElement('div');
                row.className = 'download-package-option';
                const copy = document.createElement('span');
                copy.className = 'download-package-copy';
                const name = document.createElement('strong');
                name.textContent = format.name;
                const description = document.createElement('span');
                description.textContent = `${channel.label} ${channel.architecture} · ${format.description}`;
                copy.append(name, description);
                const action = document.createElement('a');
                action.className = 'download-package-action';
                action.href = format.target ? `${siteRoot}updates/#latest-download`
                    : 'https://github.com/postmelee/alhangeul-tauri/releases';
                if (format.target) action.dataset.downloadTarget = format.target;
                action.setAttribute('aria-label', `${channel.label} ${channel.architecture} ${format.name} 다운로드 안내`);
                const state = document.createElement('span');
                state.dataset.downloadState = 'home';
                state.textContent = '다운로드';
                action.append(state);
                row.append(copy, action);
                list.append(row);
            }
        }
    }
}
