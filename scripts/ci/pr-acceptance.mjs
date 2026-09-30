import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function assertPullRequestResults(needs) {
  if (!needs || Object.keys(needs).length !== 1 || needs.contracts?.result !== 'success') {
    throw new Error('PR contracts must complete successfully; missing/skipped/cancelled/failed checks block merge');
  }
  return { status: 'passed', scope: 'fast-contracts' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(assertPullRequestResults(JSON.parse(process.env.PR_NEEDS_JSON ?? 'null'))));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
