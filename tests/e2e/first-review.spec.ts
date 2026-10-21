import { test, expect } from '@playwright/test';

const ownWorkflow = `name: My actual review
on: push
permissions: {}
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: echo checked
`;

test('shared comparison link opens a labeled local exercise without fetching workflow data', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/?example=compare');
  await expect(page.locator('#example')).toHaveValue('compare');
  await expect(page.locator('#baseline-status')).toContainText('Synthetic example');
  await expect(page.locator('#filename')).toHaveText('example-proposed.yml');
  await expect(page.locator('.comparison-table')).toContainText('report: permissions');
  await expect(page.locator('.comparison-table')).toContainText('contents: write');
  expect(requests.filter(url => /^https?:/.test(url) && !url.startsWith('http://127.0.0.1:4175/'))).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('opening a real workflow clears a synthetic baseline but retains an explicitly chosen baseline', async ({ page }) => {
  await page.goto('/?example=compare');
  await page.locator('#file').setInputFiles({ name: 'actual.yml', mimeType: 'text/yaml', buffer: Buffer.from(ownWorkflow) });
  await expect(page.locator('#editor')).toHaveValue(ownWorkflow);
  await expect(page.locator('#comparison-results')).toBeEmpty();
  await expect(page.locator('#baseline-status')).toContainText('Example baseline removed');
  await page.locator('#example').selectOption('compare');
  await page.locator('#baseline-file').setInputFiles({ name: 'my-base.yml', mimeType: 'text/yaml', buffer: Buffer.from(ownWorkflow) });
  await expect(page.locator('#baseline-status')).toContainText('my-base.yml');
  await page.locator('#file').setInputFiles({ name: 'actual.yml', mimeType: 'text/yaml', buffer: Buffer.from(ownWorkflow.replace('permissions: {}', 'permissions: { contents: read }')) });
  await expect(page.locator('#baseline-status')).toContainText('my-base.yml');
  await expect(page.locator('.comparison-table')).toContainText('contents: read');
});

test('only the known example query is accepted and the preset also starts the exercise', async ({ page }) => {
  await page.goto('/?example=https://example.invalid/private.yml');
  await expect(page.locator('#filename')).toHaveText('community-pr.yml');
  await expect(page.locator('#comparison-results')).toBeEmpty();
  await page.locator('#example').selectOption('compare');
  await expect(page.locator('#comparison-results')).toContainText('report: permissions');
  await page.getByRole('button', { name: 'Use current as baseline' }).click();
  await page.locator('#file').setInputFiles({ name: 'actual.yml', mimeType: 'text/yaml', buffer: Buffer.from(ownWorkflow) });
  await expect(page.locator('#comparison-results')).not.toBeEmpty();
  await expect(page.locator('#baseline-status')).not.toContainText('Example baseline removed');
});
