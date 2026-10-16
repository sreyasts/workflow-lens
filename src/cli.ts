import { readFileSync, readSync, statSync } from 'node:fs';
import { analyze, markdown, mermaid } from './analyzer.ts';

const MAX_INPUT_BYTES = 256_000;

function readInput(path: string): string {
  if (path !== '-') {
    const metadata = statSync(path);
    if (!metadata.isFile()) throw new Error('Workflow input must be a regular file.');
    if (metadata.size > MAX_INPUT_BYTES) throw new Error('Workflow exceeds the 256 KB input limit.');
    return readFileSync(path, 'utf8');
  }

  const buffer = Buffer.alloc(8192);
  const chunks: Buffer[] = [];
  let bytes = 0;
  while (true) {
    const count = readSync(0, buffer, 0, Math.min(buffer.length, MAX_INPUT_BYTES + 1 - bytes), null);
    if (!count) break;
    bytes += count;
    if (bytes > MAX_INPUT_BYTES) throw new Error('Workflow exceeds the 256 KB input limit.');
    chunks.push(Buffer.from(buffer.subarray(0, count)));
  }
  return Buffer.concat(chunks).toString('utf8');
}

const args = process.argv.slice(2);
const input = args.filter(a => !a.startsWith('--'));
const unknown = args.filter(a => a.startsWith('--') && !['--json', '--mermaid', '--fail-on-high', '--help'].includes(a));
if (args.includes('--help')) {
  console.log('Usage: npm run inspect -- <workflow.yml | -> [--json | --mermaid] [--fail-on-high]\nUse - for stdin. Default output is Markdown including a dependency diagram. Parse errors exit 2; high hints exit 1 only with --fail-on-high.');
} else if (input.length !== 1 || unknown.length || (args.includes('--json') && args.includes('--mermaid'))) {
  console.error('Expected one workflow path or -. Run npm run inspect -- --help.'); process.exitCode = 2;
} else {
  try {
    const result = analyze(readInput(input[0]));
    if (args.includes('--mermaid') && result.errors.length) {
      console.error(result.errors.join('\n'));
    } else console.log(args.includes('--json') ? JSON.stringify(result, null, 2) : args.includes('--mermaid') ? mermaid(result) : markdown(result));
    process.exitCode = result.errors.length ? 2 : args.includes('--fail-on-high') && result.findings.some(f => f.severity === 'high') ? 1 : 0;
  } catch (error) { console.error(error instanceof Error ? error.message : 'Unable to read workflow.'); process.exitCode = 2; }
}
