// Token Radar: the entrypoint the grader runs (Node 22, standard library only).
//
// It reads the sealed snapshot, scores every pre-token protocol with the
// radar-2 model in lib/model.ts, and writes the ranked board, the dashboard
// data, the dashboard itself, the screenshots and the dossier to /output.
//
// The dashboard is a static page, no framework and no network: it reads the
// data.js this program writes from the same board, so the page and the board
// can never disagree. The dossier is written last, because the scorer
// rebuilds it from this /output and compares the bytes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input snapshot.json
//
// The run is only finished when the output reads back the way it was written:
// after writing board.json, main.ts reads it back and compares every rank,
// slug and implied value with the board in memory. A mismatch exits 1.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { boardMatchesFile, categoryLines, summarizeBoard, summaryLines } from './lib/summary.ts';
import { buildDossier } from './vendor/makefun-board.ts';

/** The scorer's own caps: the text cap shapes the bytes, the rest refuse. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;
const MIN_SCREENSHOTS = 3;

/** Read `--name <value>` from the arguments, or fall back. */
function flagValue(name: string, fallback: string): string {
  const position = process.argv.indexOf(`--${name}`);
  if (position >= 0 && position + 1 < process.argv.length) return process.argv[position + 1]!;
  const equalsForm = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsForm !== undefined) return equalsForm.slice(name.length + 3);
  return fallback;
}

/** Fail with a message on stderr and exit code 2, the way a bad input should. */
function fail(message: string): never {
  process.stderr.write(`token radar: ${message}\n`);
  process.exit(2);
}

/** Copy one directory's regular files into `to`, skipping dotfiles. */
function copyDirectory(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

/** The whole run, from snapshot to a verified /output. */
function main(): void {
  const here = fileURLToPath(new URL('.', import.meta.url));

  const inputArg = flagValue('input', '/input');
  const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
  if (!existsSync(inputFile)) {
    fail(`no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input`);
  }
  const out = flagValue('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

  const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  const issue = boardIssue(board, snapshot);
  if (issue !== null) fail(`the model wrote a board the gate refuses: ${issue}`);

  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
  writeFileSync(join(out, 'data.js'), dataScript(radar));

  copyDirectory(join(here, 'dashboard'), join(out, 'dashboard'));
  const shots = copyDirectory(join(here, 'screenshots'), join(out, 'screenshots'));
  if (shots.length < MIN_SCREENSHOTS) {
    fail(`screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view`);
  }
  for (const name of shots) {
    if (!IMAGE_NAME.test(name)) {
      fail(`screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`);
    }
  }

  // The dossier is written last: the scorer rebuilds it from this /output and compares bytes.
  writeFileSync(
    join(out, 'dossier.json'),
    buildDossier(out, {
      text_max_bytes: TEXT_MAX_BYTES,
      screenshots: SCREENSHOT_CAPS,
      dashboard: { max_files: 400, max_bytes: 4_194_304 },
    }),
  );

  // Read the board back and refuse to finish unless it is the board we wrote.
  const mismatch = boardMatchesFile(board, readFileSync(join(out, 'board.json'), 'utf8'));
  if (mismatch !== null) fail(`the output did not read back whole: ${mismatch}`);

  const summary = summarizeBoard(board, snapshot);
  const lines = [
    `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)`,
    `token radar: wrote ${join(out, 'board.json')}, ${join(out, 'data.js')}, ${join(out, 'dashboard')} (3 files), ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}`,
    ...summaryLines(summary),
    ...categoryLines(board),
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

main();
