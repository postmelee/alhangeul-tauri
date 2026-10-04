import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPagesFixture, publishedManifestFixture } from './pages-release-fixtures.mjs';
import { releaseNotesFixture } from './release-note-fixtures.mjs';
import { renderWebsiteNotes } from '../../scripts/releases/website-render.mjs';

export const templates = {
  github: await readFile(new URL('../../mydocs/_templates/release_notes.md', import.meta.url), 'utf8'),
  website: await readFile(new URL('../../mydocs/_templates/website_release_note.html', import.meta.url), 'utf8'),
};

export async function createReleaseNotesFiles(options = {}) {
  const notes = options.notes ?? releaseNotesFixture();
  const release = options.release ?? publishedManifestFixture();
  if (!options.release) release.notes = notes.content.updaterSummary;
  const fixture = await createPagesFixture(release, { includeNotes: false });
  await mkdir(join(fixture.root, 'mydocs/_templates'), { recursive: true });
  for (const name of ['release_notes.md', 'website_release_note.html']) {
    await cp(new URL(`../../mydocs/_templates/${name}`, import.meta.url), join(fixture.root, 'mydocs/_templates', name));
  }
  const sourceDirectory = join(fixture.root, 'docs/releases');
  await mkdir(sourceDirectory, { recursive: true });
  const notesFile = join(sourceDirectory, `${notes.metadata.tag}.notes.json`);
  const pageFile = join(fixture.root, 'site/updates', `${notes.metadata.tag}.html`);
  await writeFile(notesFile, `${JSON.stringify(notes, null, 2)}\n`);
  if (notes.metadata.status === 'published') await writeFile(pageFile, renderWebsiteNotes(notes, templates.website));
  return { ...fixture, notes, release, notesFile, pageFile };
}
