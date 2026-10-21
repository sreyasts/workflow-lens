import { closeSync, fstatSync, openSync, readSync, statSync } from 'node:fs';
import { analyze, markdown, mermaid } from './analyzer.ts';
import { compareWorkflows, comparisonMarkdown } from './compare.ts';

const MAX_INPUT_BYTES = 256_000;

function readBounded(fd: number): string {
  const buffer = Buffer.alloc(8192);
  const chunks: Buffer[] = [];
  let bytes = 0;
  while (true) {
    const count = readSync(fd, buffer, 0, Math.min(buffer.length, MAX_INPUT_BYTES + 1 - bytes), null);
    if (!count) break;
    bytes += count;
    if (bytes > MAX_INPUT_BYTES) throw new Error('Workflow exceeds the 256 KB input limit.');
    chunks.push(Buffer.from(buffer.subarray(0, count)));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function readInput(path: string): string {
  if (path === '-') return readBounded(0);

  const pathMetadata = statSync(path);
  if (!pathMetadata.isFile()) throw new Error('Workflow input must be a regular file.');
  if (pathMetadata.size > MAX_INPUT_BYTES) throw new Error('Workflow exceeds the 256 KB input limit.');

  const fd = openSync(path, 'r');
  try {
    const metadata = fstatSync(fd);
    if (!metadata.isFile()) throw new Error('Workflow input must be a regular file.');
    if (metadata.size > MAX_INPUT_BYTES) throw new Error('Workflow exceeds the 256 KB input limit.');
    return readBounded(fd);
  } finally {
    closeSync(fd);
  }
}

const args = process.argv.slice(2);
const input: string[] = [];
const flags = new Set<string>();
let baseline: string | undefined;
let invalid = false;
for (let index = 0; index < args.length; index++) {
  const argument = args[index];
  if (argument === '--compare') {
    if (flags.has(argument)) invalid = true;
    flags.add(argument);
    const path = args[++index];
    if (!path || path.startsWith('-')) invalid = true;
    else baseline = path;
  } else if (['--json', '--mermaid', '--fail-on-high', '--help'].includes(argument)) {
    if (flags.has(argument)) invalid = true;
    flags.add(argument);
  } else if (argument.startsWith('-') && argument !== '-') invalid = true;
  else input.push(argument);
}
if (args.length === 1 && flags.has('--help')) {
  console.log('Usage: workflow-lens <workflow.yml | -> [--json | --mermaid] [--fail-on-high]\n       workflow-lens <proposed.yml | -> --compare <baseline.yml> [--json] [--fail-on-high]\nUse - for proposed stdin; the baseline must be a regular file. Comparison is incompatible with --mermaid.\nDefault output is Markdown. Parse/input errors exit 2; --fail-on-high exits 1 for any high hint in the proposed workflow, including existing hints.');
} else if (invalid || flags.has('--help') || input.length !== 1 || (flags.has('--json') && flags.has('--mermaid')) || (baseline !== undefined && flags.has('--mermaid'))) {
  console.error('Invalid arguments. Expected one workflow path or -. Run workflow-lens --help.'); process.exitCode = 2;
} else {
  try {
    const source = readInput(input[0]);
    if (baseline !== undefined) {
      const comparison = compareWorkflows(readInput(baseline), source);
      console.log(flags.has('--json') ? JSON.stringify(comparison, null, 2) : `${comparisonMarkdown(comparison)}\n\n${markdown(comparison.after)}`);
      process.exitCode = comparison.before.errors.length || comparison.after.errors.length ? 2
        : flags.has('--fail-on-high') && comparison.after.findings.some(finding => finding.severity === 'high') ? 1 : 0;
    } else {
      const result = analyze(source);
      if (flags.has('--mermaid') && result.errors.length) console.error(result.errors.join('\n'));
      else console.log(flags.has('--json') ? JSON.stringify(result, null, 2) : flags.has('--mermaid') ? mermaid(result) : markdown(result));
      process.exitCode = result.errors.length ? 2 : flags.has('--fail-on-high') && result.findings.some(finding => finding.severity === 'high') ? 1 : 0;
    }
  } catch (error) { console.error(error instanceof Error ? error.message : 'Unable to read workflow.'); process.exitCode = 2; }
}
