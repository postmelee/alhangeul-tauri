import { publishedManifestFixture } from './pages-release-fixtures.mjs';

const REPOSITORY = 'postmelee/alhangeul-tauri';
const RHWP = { tag: 'v0.8.6', commit: 'f1f9c6ae58344ee9368996d3543f76b9345cf227' };

// 합성 문구·hash·signature 구조 fixture. 실제 게시·서명 검증 결과가 아니다.
export function releaseNotesFixture() {
  const release = publishedManifestFixture();
  const inventory = release.updater.inventory;
  return {
    schemaVersion: 1,
    metadata: {
      repository: REPOSITORY,
      status: 'published',
      version: release.version,
      tag: release.tag,
      sourceSha: inventory.sourceSha,
      publishedAt: release.publishedAt,
      rhwp: { ...RHWP },
      previous: { version: '0.1.0', tag: 'v0.1.0', sourceSha: 'b'.repeat(40), rhwp: { ...RHWP } },
      assets: installerAssets(inventory),
      updaterInventory: inventory,
    },
    content: {
      summary: ['문서를 여는 속도를 개선했습니다.'],
      rhwpChanges: { status: 'unchanged', paragraphs: ['기존 rhwp v0.8.6을 유지합니다.'] },
      appChanges: ['필요한 로컬 글꼴을 조회하는 시간을 줄였습니다.'],
      supportedEnvironments: ['Windows x64와 Linux x64, Linux arm64 DEB를 지원합니다.'],
      installation: ['AppImage는 실행 권한을 부여하고 쓰기 가능한 위치에 보관합니다.'],
      updateInstructions: ['앱에서 다운로드 및 설치를 선택해 진행합니다. 수동 패키지는 새 파일을 받습니다.'],
      limitations: ['모든 문서와 프린터 조합의 표시를 검증하지 않았습니다.'],
      updaterSummary: '로컬 글꼴 사용 시 문서를 여는 속도를 개선했습니다.\n\n알려진 한계는 릴리즈 안내를 확인하세요.',
      references: {
        checkedAt: '2026-08-28T00:00:00Z',
        pullRequests: [pullRequestFixture()],
        resolvedIssues: [],
        relatedIssues: [issueFixture()],
      },
    },
  };
}

function installerAssets(inventory) {
  const assets = Object.fromEntries(Object.entries(inventory.targets).map(([target, entry]) => [target, {
    name: entry.path.split('/').at(-1), size: entry.size, sha256: entry.sha256, url: entry.url,
  }]));
  const files = {
    'linux-x86_64-deb': `Alhangeul_${inventory.version}_amd64.deb`,
    'linux-x86_64-rpm': `Alhangeul-${inventory.version}-1.x86_64.rpm`,
    'linux-aarch64-deb': `Alhangeul_${inventory.version}_arm64.deb`,
  };
  for (const [target, name] of Object.entries(files)) {
    assets[target] = {
      name, size: 1234, sha256: 'd'.repeat(64),
      url: `https://github.com/${REPOSITORY}/releases/download/${inventory.tag}/${name}`,
    };
  }
  return assets;
}

export function issueFixture(number = 7, overrides = {}) {
  return {
    number, title: '합성 문서 열기 작업', url: `https://github.com/${REPOSITORY}/issues/${number}`,
    state: 'OPEN', resolution: null,
    evidence: [`https://github.com/${REPOSITORY}/pull/8`], ...overrides,
  };
}

export function pullRequestFixture(overrides = {}) {
  return {
    number: 8, title: '합성 문서 열기 개선', url: `https://github.com/${REPOSITORY}/pull/8`,
    category: 'app', summaryIncluded: true,
    evidence: [`https://github.com/${REPOSITORY}/commit/${'a'.repeat(40)}`], ...overrides,
  };
}
