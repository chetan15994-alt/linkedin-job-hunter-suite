const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { chromium } = require('playwright');
const { inspectComplexField, solveAndFillComplexWidget } = require('../src/llmFieldSolver');

test('inspectComplexField identifies range sliders', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><input type="range" id="slider1" min="1" max="10" step="1" value="5" /></body></html>');
  });

  await new Promise(r => server.listen(0, r));
  const port = server.address().port;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/`);

  const locator = page.locator('#slider1');
  const res = await inspectComplexField(page, locator);
  assert.equal(res.widgetType, 'slider');
  assert.equal(res.min, 1);
  assert.equal(res.max, 10);

  const fillRes = await solveAndFillComplexWidget(page, locator, 'Rate your proficiency');
  assert.equal(fillRes.status, 'FILLED');
  assert.equal(fillRes.action, 'slider_set');

  const val = await locator.inputValue();
  assert.equal(val, '10');

  await browser.close();
  server.close();
});

test('inspectComplexField identifies linear rating scales', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html><body>
        <div role="radiogroup" id="scale1">
          <div role="radio" data-value="1">1</div>
          <div role="radio" data-value="2">2</div>
          <div role="radio" data-value="3">3</div>
          <div role="radio" data-value="4">4</div>
          <div role="radio" data-value="5">5</div>
        </div>
      </body></html>
    `);
  });

  await new Promise(r => server.listen(0, r));
  const port = server.address().port;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/`);

  const locator = page.locator('#scale1');
  const res = await inspectComplexField(page, locator);
  assert.equal(res.widgetType, 'rating_scale');

  const fillRes = await solveAndFillComplexWidget(page, locator, 'Rate PM experience');
  assert.equal(fillRes.status, 'FILLED');
  assert.equal(fillRes.action, 'rating_selected');

  await browser.close();
  server.close();
});
