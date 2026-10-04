// 홈과 업데이트 페이지가 공유하는 공개 설치 파일 표시·검증 경계.
const downloadRepository = 'https://github.com/postmelee/alhangeul-tauri';
const packageCatalog = [
    { target: 'windows-x86_64-nsis', platform: 'windows', architecture: 'x64', format: 'NSIS', updateMode: 'app', description: '일반 설치 권장', file: v => `Alhangeul_${v}_x64-setup.exe` },
    { target: 'windows-x86_64-msi', platform: 'windows', architecture: 'x64', format: 'MSI', updateMode: 'app', description: '조직·관리 배포', file: v => `Alhangeul_${v}_x64_en-US.msi` },
    { target: 'linux-x86_64-appimage', platform: 'linux', architecture: 'x64', format: 'AppImage', updateMode: 'app', description: '배포판 공통 실행', file: v => `Alhangeul_${v}_amd64.AppImage` },
    { target: 'linux-x86_64-deb', platform: 'linux', architecture: 'x64', format: 'DEB', updateMode: 'manual', description: 'DEB 패키지 설치', file: v => `Alhangeul_${v}_amd64.deb` },
    { target: 'linux-x86_64-rpm', platform: 'linux', architecture: 'x64', format: 'RPM', updateMode: 'manual', description: 'RPM 패키지 설치', file: v => `Alhangeul-${v}-1.x86_64.rpm` },
    { target: 'linux-aarch64-deb', platform: 'linux', architecture: 'arm64', format: 'DEB', updateMode: 'manual', description: 'ARM 기기용 패키지', file: v => `Alhangeul_${v}_arm64.deb` },
];

function matchesCatalogIdentity(data, release) {
    return data?.schemaVersion === 1 && data.status === 'published' && release?.status === 'published'
        && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(data.version)
        && data.version === release.version && data.tag === `v${data.version}` && data.tag === release.tag
        && /^[a-f0-9]{40}$/.test(data.sourceSha);
}

function isCompatiblePackageDownloads(data, release) {
    if (!matchesCatalogIdentity(data, release)) return false;
    if (!Array.isArray(data.packages) || data.packages.length !== packageCatalog.length) return false;
    if (!release.downloads || typeof release.updater?.manifestPublished !== 'boolean') return false;
    if (!data.packages.every((entry, index) => isValidPackageEntry(entry, packageCatalog[index], data))) return false;
    const appPackages = data.packages.filter(entry => entry.updateMode === 'app');
    if (!matchesReleaseDownloads(release.downloads, appPackages)) return false;
    if (!release.updater.manifestPublished) return release.updater.inventory === null;
    return matchesDownloadInventory(release.updater.inventory, data, appPackages);
}

function matchesReleaseDownloads(downloads, packages) {
    return Object.keys(downloads).length === packages.length
        && packages.every(entry => downloads[entry.target] === entry.url);
}

function isValidPackageEntry(entry, contract, data) {
    if (!entry || ['target', 'platform', 'architecture', 'format', 'updateMode'].some(key => entry[key] !== contract[key])) return false;
    const name = contract.file(data.version);
    return entry.name === name && entry.url === `${downloadRepository}/releases/download/${data.tag}/${name}`
        && Number.isSafeInteger(entry.size) && entry.size > 0 && /^[a-f0-9]{64}$/.test(entry.sha256);
}

function matchesDownloadInventory(inventory, data, packages) {
    return inventory?.sourceSha === data.sourceSha && inventory.version === data.version && inventory.tag === data.tag
        && inventory.repository === 'postmelee/alhangeul-tauri' && inventory.targets
        && Object.keys(inventory.targets).length === packages.length
        && packages.every(entry => ['url', 'size', 'sha256'].every(key => inventory.targets[entry.target]?.[key] === entry[key]));
}

function packageLabel(contract) {
    return `${contract.platform === 'windows' ? 'Windows' : 'Linux'} ${contract.architecture} ${contract.format}`;
}

function renderPackageLists() {
    for (const list of document.querySelectorAll('[data-package-platform]')) {
        for (const contract of packageCatalog.filter(item => item.platform === list.dataset.packagePlatform)) {
            list.append(renderPackageRow(contract));
        }
    }
}

function renderPackageRow(contract) {
    const row = document.createElement('div');
    row.className = 'download-package-option';
    const copy = document.createElement('span');
    copy.className = 'download-package-copy';
    const name = document.createElement('strong');
    name.textContent = `${contract.format} ${contract.architecture}`;
    const description = document.createElement('span');
    description.className = 'download-package-description';
    description.textContent = contract.description;
    const mode = document.createElement('span');
    mode.className = 'download-update-mode';
    mode.textContent = contract.updateMode === 'app' ? '앱 내 업데이트 지원' : '수동 업데이트';
    copy.append(name, description, mode);
    const action = document.createElement('a');
    action.className = 'download-package-action';
    action.href = `${downloadRepository}/releases`;
    action.dataset.downloadTarget = contract.target;
    action.textContent = '다운로드 안내';
    action.setAttribute('aria-label', `${packageLabel(contract)} 다운로드 안내 · GitHub Releases`);
    row.append(copy, action);
    return row;
}

function activatePackageDownloads(data, release) {
    if (!isCompatiblePackageDownloads(data, release)) return false;
    for (const action of document.querySelectorAll('[data-download-target]')) {
        const entry = data.packages.find(item => item.target === action.dataset.downloadTarget);
        const contract = packageCatalog.find(item => item.target === action.dataset.downloadTarget);
        if (!entry || !contract) continue;
        action.href = entry.url;
        action.textContent = '다운로드';
        action.dataset.downloadReady = 'true';
        action.setAttribute('aria-label', `${packageLabel(contract)} · 알한글 ${release.version} 다운로드`);
    }
    return true;
}

const packageDownloads = { renderLists: renderPackageLists, activate: activatePackageDownloads, isCompatible: isCompatiblePackageDownloads };
