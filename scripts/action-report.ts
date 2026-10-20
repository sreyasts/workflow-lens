import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { markdown, mermaid, type Analysis } from '../src/analyzer.ts';

const [workflow, ...flags] = process.argv.slice(2);
const summary = process.env.WORKFLOW_LENS_SUMMARY ?? 'true';
if (!workflow || flags.some(flag => !['--json', '--mermaid', '--fail-on-high'].includes(flag))
  || (flags.includes('--json') && flags.includes('--mermaid')) || !['true', 'false'].includes(summary)) {
  console.error('Invalid Workflow Lens action report arguments.');
  process.exitCode = 2;
} else {
  // Analyze once through the bounded CLI reader, then render both views from that exact result.
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../src/cli.ts', import.meta.url)), workflow, '--json',
    ...(flags.includes('--fail-on-high') ? ['--fail-on-high'] : [])], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  process.exitCode = result.status ?? 2;
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) console.error('Unable to run the Workflow Lens analyzer.');
  if (result.stdout) {
    try {
      const analysis: Analysis = JSON.parse(result.stdout);
      const report = markdown(analysis);
      if (flags.includes('--json')) process.stdout.write(result.stdout);
      else if (flags.includes('--mermaid')) {
        if (analysis.errors.length) console.error(analysis.errors.join('\n'));
        else console.log(mermaid(analysis));
      } else console.log(report);

      if (summary === 'true' && process.env.GITHUB_STEP_SUMMARY) {
        try {
          appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
        } catch {
          console.error('Workflow Lens could not write the job summary; the report remains in the step log.');
        }
      }
    } catch {
      console.error('Unable to render the Workflow Lens analysis result.');
      if (!process.exitCode) process.exitCode = 2;
    }
  }
}
