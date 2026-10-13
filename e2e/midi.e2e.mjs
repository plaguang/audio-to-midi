import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3124';

const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  console.log(`1. Testing Home / Audio to MIDI Converter (${BASE}/)`);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const h1 = await page.locator('h1').textContent();
  assert(h1 && h1.includes('Audio to MIDI Converter'), `H1 rendered: "${h1?.trim()}"`);

  // Load Demo Melody (with stray notes)
  await page.getByRole('button', { name: /Load Demo Melody/i }).click();
  await page.waitForSelector('[data-testid="note-stats"]', { timeout: 10000 });

  const stats80 = await page.getByTestId('note-stats').textContent();
  assert(stats80?.includes('Clean notes: 5') && stats80?.includes('Stray notes filtered: 2'),
    `Default 80ms filter keeps 5 clean notes & removes 2 stray notes (got: "${stats80?.trim()}")`);

  // Lower Min Note Length slider to 20ms -> should show 7 clean notes (0 stray)
  const slider = page.getByLabel('Min Note Length');
  await slider.fill('20');
  await slider.dispatchEvent('change');
  const stats20 = await page.getByTestId('note-stats').textContent();
  assert(stats20?.includes('Clean notes: 7') && stats20?.includes('Stray notes filtered: 0'),
    `20ms filter reveals all 7 notes including 2 stray notes (got: "${stats20?.trim()}")`);

  // Restore slider to 80ms -> back to 5 clean notes
  await slider.fill('80');
  await slider.dispatchEvent('change');
  const statsRestored = await page.getByTestId('note-stats').textContent();
  assert(statsRestored?.includes('Clean notes: 5'), `Restoring 80ms filter returns to 5 clean notes`);

  // Click a note chip to delete 1 note -> 4 clean notes
  await page.locator('span[title="Click to remove note"]').first().click();
  const statsAfterDel = await page.getByTestId('note-stats').textContent();
  assert(statsAfterDel?.includes('Clean notes: 4'), `Clicking a note removes it -> 4 clean notes remain`);

  // Export .mid and verify SMF binary header ("MThd" + "MTrk")
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Download \.MID/i }).click(),
  ]);
  const midiPath = await download.path();
  const midiBuf = fs.readFileSync(midiPath);
  const magic = midiBuf.subarray(0, 4).toString('ascii');
  const trkMagic = midiBuf.subarray(14, 18).toString('ascii');
  assert(magic === 'MThd' && trkMagic === 'MTrk' && midiBuf.length > 30,
    `Valid SMF .mid binary exported (${midiBuf.length} bytes, header=${magic}/${trkMagic})`);

  console.log('2. Testing Stereo to Mono WAV Converter (/stereo-to-mono-converter)');
  await page.goto(`${BASE}/stereo-to-mono-converter`, { waitUntil: 'networkidle' });
  const smH1 = await page.locator('h1').textContent();
  assert(smH1 && smH1.includes('Stereo to Mono Converter'), `Stereo-to-Mono H1 rendered: "${smH1?.trim()}"`);

  await page.getByRole('button', { name: /Load Demo Stereo Sample/i }).click();
  await page.waitForSelector('[data-testid="phase-meter"]', { timeout: 10000 });
  const phaseText = await page.getByTestId('phase-meter').textContent();
  assert(phaseText && phaseText.includes('Phase Correlation:'), `Phase correlation calculated ("${phaseText?.trim()}")`);

  await page.getByText('Left Channel Only (L)').click();

  const [wavDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Download 16-bit Mono WAV/i }).click(),
  ]);
  const wavPath = await wavDownload.path();
  const wavBuf = fs.readFileSync(wavPath);
  const riff = wavBuf.subarray(0, 4).toString('ascii');
  const wave = wavBuf.subarray(8, 12).toString('ascii');
  const numChannels = wavBuf.readUInt16LE(22);
  assert(riff === 'RIFF' && wave === 'WAVE' && numChannels === 1,
    `Valid 1-channel Mono WAV exported (${wavBuf.length} bytes, channels=${numChannels})`);

  console.log('3. Testing All Remaining SEO Cluster Routes & Sitemap');
  for (const route of ['/voice-to-midi', '/hum-to-midi', '/mp3-to-midi', '/wav-to-midi', '/sitemap.xml', '/robots.txt']) {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    assert(res && res.status() === 200, `Route ${route} returned HTTP 200`);
  }

  assert(consoleErrors.length === 0, `Zero console/page errors (${consoleErrors.length})`);

  await browser.close();
  console.log('\nALL AUDIO-TO-MIDI E2E CHECKS PASSED!');
})();
