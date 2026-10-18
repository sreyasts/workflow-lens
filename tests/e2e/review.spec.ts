import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const workflow = `name: Local review
on: push
permissions:
  contents: read
  id-token: write
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - run: echo secrets.NOT_A_REFERENCE
`;

test('job cards describe requested OIDC separately and do not claim a clean audit', async ({ page }) => {
  await page.goto('/');
  await page.locator('#editor').fill(workflow);
  const card = page.locator('[data-job="review"]');
  await expect(card).toContainText('OIDC requested');
  await expect(card).toContainText('No high hints');
  await expect(card).not.toContainText('Write access');
  await expect(card).not.toContainText('Clean');
  await card.click();
  await expect(card).toBeFocused();
  await expect(page.locator('.job-details')).toContainText('None detected');
  await expect(page.locator('.job-details')).toContainText('id-token: write');
  const hints = page.getByRole('tab', { name: /Review hints/ });
  await hints.click();
  await expect(hints).toBeFocused();
});

test('invalid dependencies prevent maps and report downloads', async ({ page }) => {
  await page.goto('/');
  await page.locator('#editor').fill(workflow.replace('runs-on: ubuntu-latest', 'needs: [missing, 42]\n    runs-on: ubuntu-latest'));
  await expect(page.getByRole('alert')).toContainText('needs must be a non-empty string');
  await expect(page.locator('.graph')).toHaveCount(0);
  for (const id of ['export-md', 'copy-report', 'export-mermaid']) await expect(page.locator(`#${id}`)).toBeDisabled();
});

for (const replacement of ['edit', 'clear', 'new-file'] as const) {
  test(`a pending file read cannot overwrite a later ${replacement}`, async ({ page }) => {
    await page.addInitScript(() => {
      const original = File.prototype.text;
      File.prototype.text = async function(this: File) {
        if (this.name === 'slow.yml') await new Promise<void>(resolve => window.addEventListener('release-test-file', () => resolve(), { once: true }));
        try { return await original.call(this); }
        finally { if (this.name === 'slow.yml') window.dispatchEvent(new Event('file-read-finished')); }
      };
    });
    await page.goto('/');
    await page.locator('#file').setInputFiles({ name: 'slow.yml', mimeType: 'text/yaml', buffer: Buffer.from(workflow) });
    await expect(page.locator('#file-status')).toHaveText('Reading local workflow…');
    const newer = workflow.replace('Local review', 'Newer review');
    if (replacement === 'edit') await page.locator('#editor').fill(newer);
    else if (replacement === 'clear') await page.getByRole('button', { name: 'Clear', exact: true }).click();
    else await page.locator('#file').setInputFiles({ name: 'newer.yml', mimeType: 'text/yaml', buffer: Buffer.from(newer) });
    await expect(page.locator('#editor')).toHaveValue(replacement === 'clear' ? '' : newer);
    // Wait for the held read and its application continuation, not an arbitrary delay.
    await page.evaluate(() => new Promise<void>(resolve => {
      window.addEventListener('file-read-finished', () => setTimeout(resolve, 0), { once: true });
      window.dispatchEvent(new Event('release-test-file'));
    }));
    await expect(page.locator('#editor')).toHaveValue(replacement === 'clear' ? '' : newer);
    if (replacement === 'new-file') await expect(page.locator('#filename')).toHaveText('newer.yml');
    await expect(page.locator('#file-status')).toBeHidden();
  });
}

test('invalid file feedback stays visible with an empty editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.locator('#parse-status')).toHaveText('Ready');
  await page.locator('#file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('notes') });
  await expect(page.locator('#file-status')).toBeVisible();
  await expect(page.locator('#file-status')).toContainText('Choose a .yml or .yaml');
  await expect(page.locator('#editor')).toHaveValue('');
});

test('clipboard failure has a working Markdown download fallback', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }));
  await page.goto('/');
  await page.locator('#editor').fill(workflow);
  await page.getByRole('button', { name: 'Copy PR Report', exact: true }).click();
  await expect(page.locator('#export-status')).toContainText('Clipboard unavailable');
  const event = page.waitForEvent('download');
  await page.locator('#export-md').click();
  const download = await event;
  const path = await download.path();
  expect(path).not.toBeNull();
  const report = await readFile(path!, 'utf8');
  expect(report).toContain('# Workflow Lens: Local review');
  expect(report).toContain('```mermaid\nflowchart LR');
  expect(report).toContain('## Job: review');
  expect(report).toContain('Secret references: none detected');
});

for (const width of [390, 1280]) {
  test(`theme, keyboard navigation and local-only loading at ${width}px`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByText('Settings', { exact: true }).click();
    await page.locator('#theme').selectOption('dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#editor').focus();
    await page.locator('#editor').press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(requests.filter(url => /^https?:/.test(url) && !url.startsWith('http://127.0.0.1:4175/'))).toEqual([]);
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['workflow-lens-theme']);
    await page.screenshot({ path: test.info().outputPath(`review-${width}.png`), fullPage: true });
  });
}
