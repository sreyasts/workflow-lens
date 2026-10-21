import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const baseline = `name: Review example
on: push
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello
`;
const proposed = baseline.replace('contents: read', 'contents: write');

for (const width of [390, 1280]) {
  test(`local comparison and JSON/Markdown exports at ${width}px`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.locator('#editor').fill(baseline);
    await page.getByRole('button', { name: 'Use current as baseline' }).click();
    await expect(page.locator('#comparison-results')).toContainText('No changes in compared fields');
    await page.locator('#editor').fill(proposed);
    const table = page.locator('.comparison-table');
    await expect(table).toContainText('permissions');
    await expect(table).toContainText('contents: read');
    await expect(table).toContainText('contents: write');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const jsonEvent = page.waitForEvent('download');
    await page.locator('#export-json').click();
    const jsonPath = await (await jsonEvent).path();
    const json = JSON.parse(await readFile(jsonPath!, 'utf8'));
    expect(json.before.jobs[0].permissions.contents).toBe('read');
    expect(json.after.jobs[0].permissions.contents).toBe('write');
    expect(json.changes.some((change: { field: string }) => change.field === 'permissions')).toBe(true);
    const mdEvent = page.waitForEvent('download');
    await page.locator('#export-md').click();
    const markdownPath = await (await mdEvent).path();
    const markdown = await readFile(markdownPath!, 'utf8');
    expect(markdown).toContain('contents: read');
    expect(markdown).toContain('contents: write');
    expect(markdown).toContain('```mermaid');
    expect(requests.filter(url => /^https?:/.test(url) && !url.startsWith('http://127.0.0.1:4175/'))).toEqual([]);
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`comparison-${width}.png`), fullPage: true });
    await page.reload();
    await expect(page.locator('#comparison-results')).toBeEmpty();
  });
}

test('invalid baseline blocks reports and removing it restores a single review', async ({ page }) => {
  await page.goto('/');
  await page.locator('#editor').fill(proposed);
  await page.locator('#baseline-file').setInputFiles({ name: 'bad.yml', mimeType: 'text/yaml', buffer: Buffer.from('jobs: [') });
  await expect(page.locator('#comparison-results [role="alert"]')).toContainText('Baseline:');
  for (const id of ['copy-report', 'export-md', 'export-json', 'export-mermaid']) await expect(page.locator(`#${id}`)).toBeDisabled();
  await page.getByRole('button', { name: 'Remove baseline' }).click();
  await expect(page.getByRole('button', { name: 'Use current as baseline' })).toBeFocused();
  await expect(page.locator('#comparison-results')).toBeEmpty();
  await expect(page.locator('#copy-report')).toBeEnabled();
  await expect(page.locator('#export-json')).toBeEnabled();
});

test('a pending baseline read cannot overwrite a newer snapshot', async ({ page }) => {
  await page.addInitScript(() => {
    const original = File.prototype.text;
    File.prototype.text = async function(this: File) {
      await new Promise<void>(resolve => window.addEventListener('release-baseline', () => resolve(), { once: true }));
      try { return await original.call(this); }
      finally { window.dispatchEvent(new Event('baseline-read-finished')); }
    };
  });
  await page.goto('/');
  await page.locator('#editor').fill(baseline);
  await page.locator('#baseline-file').setInputFiles({ name: 'slow.yml', mimeType: 'text/yaml', buffer: Buffer.from(proposed) });
  await expect(page.locator('#baseline-status')).toHaveText('Reading local baseline…');
  await expect(page.locator('#export-md')).toBeDisabled();
  await expect(page.locator('#export-json')).toBeDisabled();
  await page.getByRole('button', { name: 'Use current as baseline' }).click();
  await page.evaluate(() => new Promise<void>(resolve => {
    window.addEventListener('baseline-read-finished', () => setTimeout(resolve, 0), { once: true });
    window.dispatchEvent(new Event('release-baseline'));
  }));
  await expect(page.locator('#comparison-results')).toContainText('No changes in compared fields');
  await expect(page.locator('#baseline-status')).not.toContainText('slow.yml');
});

test('hostile baseline text remains inert and invalid file selection preserves the baseline', async ({ page }) => {
  await page.goto('/');
  await page.locator('#editor').fill(baseline);
  await page.locator('#baseline-file').setInputFiles({ name: 'base.yml', mimeType: 'text/yaml', buffer: Buffer.from(baseline.replace('ubuntu-latest', '"<img src=x onerror=alert(1)>"')) });
  await expect(page.locator('#comparison-results')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#comparison-results img')).toHaveCount(0);
  await page.locator('#baseline-file').setInputFiles({ name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('bad') });
  await expect(page.locator('#baseline-status')).toContainText('Existing baseline unchanged');
  await expect(page.locator('#comparison-results')).toContainText('<img src=x onerror=alert(1)>');
});
