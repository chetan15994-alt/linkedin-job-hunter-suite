const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { chromium } = require('playwright');
const {
  locateSubmitOrNextButton,
  verifySubmissionSuccess,
  detectValidationErrors,
  executeAutonomousSubmission,
  SUBMIT_BUTTON_SELECTORS
} = require('../src/submissionEngine');

test('SUBMIT_BUTTON_SELECTORS includes major ATS submit selectors', () => {
  assert.ok(SUBMIT_BUTTON_SELECTORS.length >= 8);
  assert.ok(SUBMIT_BUTTON_SELECTORS.some(s => s.includes('Submit')));
  assert.ok(SUBMIT_BUTTON_SELECTORS.some(s => s.includes('#submit_app')));
});

test('verifySubmissionSuccess identifies success URLs and confirmation text', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    if (req.url === '/submitted') {
      res.end('<html><body><h1>Application Submitted!</h1><p>Thank you for applying.</p></body></html>');
    } else {
      res.end('<html><body><div>Your response has been recorded.</div></body></html>');
    }
  });

  await new Promise(r => server.listen(0, r));
  const port = server.address().port;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`http://localhost:${port}/submitted`);
  const res1 = await verifySubmissionSuccess(page);
  assert.equal(res1.isSubmitted, true);

  await page.goto(`http://localhost:${port}/googleform-confirm`);
  const res2 = await verifySubmissionSuccess(page);
  assert.equal(res2.isSubmitted, true);

  await browser.close();
  server.close();
});

test('detectValidationErrors detects missing required question errors', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <div class="freebirdFormviewerViewItemsItemItem">
            <div class="M7eMe">What is your notice period?</div>
            <input type="text" />
            <div class="freebirdFormviewerViewItemsItemErrorMessage" role="alert">This is a required question</div>
          </div>
        </body>
      </html>
    `);
  });

  await new Promise(r => server.listen(0, r));
  const port = server.address().port;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`http://localhost:${port}/form`);
  const errors = await detectValidationErrors(page);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].type, 'google_forms');
  assert.ok(errors[0].prompt.includes('notice period'));

  await browser.close();
  server.close();
});
