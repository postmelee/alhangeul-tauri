import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { releaseNotesFixture } from './release-note-fixtures.mjs';
import { renderWebsiteNotes } from '../../scripts/releases/website-render.mjs';

// 공개 상태 fixture에는 승인 원문과 생성 웹 안내를 함께 둔다.
// 음성 테스트와 원문 전용 테스트는 createPagesFixture의 includeNotes=false로 이를 생략한다.
export async function installPublishedNotes(root, release) {
  const notes = releaseNotesFixture(release);
  notes.content.updaterSummary = release.notes;
  await mkdir(join(root, 'mydocs/_templates'), { recursive: true });
  for (const name of ['release_notes.md', 'website_release_note.html']) {
    await cp(new URL(`../../mydocs/_templates/${name}`, import.meta.url), join(root, 'mydocs/_templates', name));
  }
  await mkdir(join(root, 'docs/releases'), { recursive: true });
  await writeFile(join(root, `docs/releases/${release.tag}.notes.json`), `${JSON.stringify(notes, null, 2)}\n`);
  const template = await readFile(join(root, 'mydocs/_templates/website_release_note.html'), 'utf8');
  await writeFile(join(root, `site/updates/${release.tag}.html`), renderWebsiteNotes(notes, template));
  return notes;
}
