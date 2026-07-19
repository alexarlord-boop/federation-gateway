#!/usr/bin/env node
// Regenerates the OpenAPI client into a scratch directory and diffs it
// against the committed src/client/. Fails (non-zero exit) if they differ,
// meaning "Federation Admin OpenAPI.yaml" changed and nobody ran
// `npm run generate:client` afterwards.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const scratch = mkdtempSync(join(tmpdir(), 'client-freshness-'));

try {
  execFileSync(
    'npx',
    [
      'openapi-typescript-codegen',
      '--input', 'Federation Admin OpenAPI.yaml',
      '--output', scratch,
      '--client', 'fetch',
    ],
    { stdio: 'inherit' },
  );

  execFileSync('diff', ['-rq', 'src/client', scratch], { stdio: 'pipe' });

  console.log('src/client is up to date with Federation Admin OpenAPI.yaml.');
} catch (err) {
  if (err.stdout || err.stderr) {
    console.error(err.stdout?.toString() ?? '');
    console.error(err.stderr?.toString() ?? '');
  }
  console.error(
    '\nsrc/client is out of date with Federation Admin OpenAPI.yaml.\n' +
    'Run `npm run generate:client` and commit the result.\n',
  );
  process.exitCode = 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
