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
  await context.route(/googletagmanager|google-analytics|clarity\.ms|_vercel\/insights/i, (route) => route.abort());
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const txt = m.text();
      if (
        !txt.includes('ERR_CONNECTION_TIMED_OUT') &&
        !txt.includes('ERR_TIMED_OUT') &&
        !txt.includes('Failed to load resource: the server responded with a status of 404')
      ) {
        consoleErrors.push(txt);
      }
    }
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  console.log(`1. Testing Home / Audio to MIDI Converter (${BASE}/)`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const h1 = await page.locator('h1').textContent();
  assert(h1 && h1.includes('Audio to MIDI Converter'), `H1 rendered: "${h1?.trim()}"`);

  // Verify sticky top navbar has all 8 links
  const navCount = await page.locator('header nav a').count();
  assert(navCount === 8, `Sticky top navbar renders all 8 tool links (got: ${navCount})`);

  // Verify automated webdriver session suppresses analytics pollution
  const isBlocked = await page.evaluate(() => navigator.webdriver === true && typeof window.gtag === 'undefined');
  assert(isBlocked, 'Automated WebDriver session suppresses GA4 / Clarity / Vercel Analytics tracking');

  // Load Demo Melody (with stray notes)
  await page.getByRole('button', { name: /Load Demo Melody/i }).click();
  await page.waitForSelector('[data-testid="note-stats"]', { timeout: 10000 });

  const stats80 = await page.getByTestId('note-stats').textContent();
  assert(stats80?.includes('Clean notes: 5') && stats80?.includes('Stray notes filtered: 2'),
    `Default 80ms filter keeps 5 clean notes & removes 2 stray notes (got: "${stats80?.trim()}")`);

  // Verify real-time Detected Key badge in top summary bar
  const keyBadge = await page.getByTestId('detected-key-badge').textContent();
  assert(keyBadge?.includes('C Major / A Minor'), `Top summary bar displays Detected Key: "${keyBadge?.trim()}"`);

  // Test 1-Click Auto-Detect Key
  await page.getByRole('button', { name: /Auto-Detect Key/i }).click();
  const selectedScale = await page.getByLabel('Scale Lock').inputValue();
  assert(selectedScale === 'C Major / A Minor', `Auto-Detect Key locked C-E-G-A-G melody to "${selectedScale}"`);

  // Test Octave Shift (+1 Oct -> C4 becomes C5)
  await page.getByLabel('Octave Shift').selectOption('1');
  const firstChipShifted = await page.locator('span[title="Click to remove note"]').first().textContent();
  assert(firstChipShifted?.startsWith('C5'), `Octave Shift +1 shifted C4 to C5 (got: "${firstChipShifted}")`);
  await page.getByLabel('Octave Shift').selectOption('0');

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

  // Click a note chip to delete 1 note -> 4 clean notes, then test Undo button -> back to 5
  await page.locator('span[title="Click to remove note"]').first().click();
  const statsAfterDel = await page.getByTestId('note-stats').textContent();
  assert(statsAfterDel?.includes('Clean notes: 4'), `Clicking a note removes it -> 4 clean notes remain`);

  await page.getByRole('button', { name: /Undo 1 manual delete/i }).click();
  const statsAfterUndo = await page.getByTestId('note-stats').textContent();
  assert(statsAfterUndo?.includes('Clean notes: 5'), `Undo manual delete restores all 5 clean notes`);

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

  // Export Synth .WAV and verify RIFF/WAVE header
  const [synthWavDl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Synth \.WAV/i }).click(),
  ]);
  const synthWavBuf = fs.readFileSync(await synthWavDl.path());
  assert(
    synthWavBuf.subarray(0, 4).toString('ascii') === 'RIFF' && synthWavBuf.length > 10000,
    `Valid Synth .WAV rendered from MIDI notes (${synthWavBuf.length} bytes)`
  );

  // Test .MID file import on /midi-player-online
  console.log('2. Testing Online MIDI Player & .MID Import (/midi-player-online)');
  await page.goto(`${BASE}/midi-player-online`, { waitUntil: 'domcontentloaded' });
  const tmpMidi = '/tmp/test-reimport.mid';
  fs.writeFileSync(tmpMidi, midiBuf);
  await page.setInputFiles('input[type="file"]', tmpMidi);
  await page.waitForSelector('[data-testid="note-stats"]', { timeout: 10000 });
  const importedStats = await page.getByTestId('note-stats').textContent();
  assert(importedStats?.includes('Clean notes: 5'), `Re-imported .MID file parsed 5 notes onto Piano Roll`);

  console.log('3. Testing Stereo to Mono WAV Converter (/stereo-to-mono-converter)');
  await page.goto(`${BASE}/stereo-to-mono-converter`, { waitUntil: 'domcontentloaded' });
  const smH1 = await page.locator('h1').textContent();
  assert(smH1 && smH1.includes('Stereo to Mono Converter'), `Stereo-to-Mono H1 rendered: "${smH1?.trim()}"`);

  // Verify context-specific feature card is shown
  const bodyText = await page.locator('main').textContent();
  assert(bodyText?.includes('Phase Correlation Meter'), `Context-specific Stereo-to-Mono feature cards rendered`);

  await page.getByRole('button', { name: /Load Demo Stereo Sample/i }).click();
  await page.waitForSelector('[data-testid="phase-meter"]', { timeout: 10000 });
  const phaseText = await page.getByTestId('phase-meter').textContent();
  assert(phaseText && phaseText.includes('Phase Correlation:'), `Phase correlation calculated ("${phaseText?.trim()}")`);

  // Toggle Normalize Mono Peak (-1.0 dBFS) and switch to Left Channel Only (L)
  await page.getByText('Normalize Mono Peak (-1.0 dBFS)').click();
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
    `Valid normalized 1-channel Mono WAV exported (${wavBuf.length} bytes, channels=${numChannels})`);

  console.log('4. Testing All Remaining SEO Cluster Routes & Sitemap');
  for (const route of ['/voice-to-midi', '/hum-to-midi', '/mp3-to-midi', '/wav-to-midi', '/audio-key-finder', '/sitemap.xml', '/robots.txt']) {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    assert(res && res.status() === 200, `Route ${route} returned HTTP 200`);
  }

  assert(consoleErrors.length === 0, `Zero console/page errors (${consoleErrors.length})`);

  await browser.close();
  console.log('\nALL 26 AUDIO-TO-MIDI E2E CHECKS PASSED!');
})();
