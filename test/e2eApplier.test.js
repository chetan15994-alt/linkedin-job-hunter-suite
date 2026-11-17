const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { applyToJob } = require('../src/applier');
const { scanPageForForm } = require('../src/formScanner');

let server;
let serverPort;
let baseUrl;

// HTML Templates for Realistic Mock ATS Job Application Portals

const GREENHOUSE_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Staff AI Product Manager at NextGen AI</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 40px auto; }
    .field { margin-bottom: 16px; }
    label { display: block; font-weight: bold; margin-bottom: 6px; }
    input[type="text"], input[type="email"], input[type="tel"], textarea, select {
      width: 100%; padding: 8px; box-sizing: border-box;
    }
    .file-dropzone { border: 2px dashed #aaa; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="posting-header">
    <h1 class="app-title">Staff AI Product Manager</h1>
    <span class="company-name">NextGen AI</span>
  </div>

  <div id="job-description">
    <p>We are seeking a Staff AI Product Manager to lead our agentic reasoning platforms, multi-step LLM trace evaluations, and enterprise AI safety guardrails.</p>
  </div>

  <form id="application_form" action="/submit-greenhouse" method="POST" enctype="multipart/form-data">
    <div class="field">
      <label for="first_name">First Name *</label>
      <input type="text" id="first_name" name="first_name" required>
    </div>

    <div class="field">
      <label for="last_name">Last Name *</label>
      <input type="text" id="last_name" name="last_name" required>
    </div>

    <div class="field">
      <label for="email">Email Address *</label>
      <input type="email" id="email" name="email" required>
    </div>

    <div class="field">
      <label for="phone">Phone Number *</label>
      <input type="tel" id="phone" name="phone" required>
    </div>

    <div class="field">
      <label for="resume">Resume / CV *</label>
      <div class="file-dropzone">
        <input type="file" id="resume" name="resume" accept=".pdf,.doc,.docx" required>
      </div>
    </div>

    <div class="field">
      <label for="job_application_answers_attributes_0_text_value">LinkedIn Profile</label>
      <input type="text" id="job_application_answers_attributes_0_text_value" name="job_application[answers_attributes][0][text_value]">
    </div>

    <div class="field">
      <label for="authorized_in_india">Are you legally authorized to work in India? *</label>
      <select id="authorized_in_india" name="authorized_in_india" required>
        <option value="">-- Please select --</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>

    <div class="field">
      <label>Will you now or in the future require visa sponsorship? *</label>
      <label><input type="radio" name="visa_sponsorship" value="yes" required> Yes</label>
      <label><input type="radio" name="visa_sponsorship" value="no"> No</label>
    </div>

    <div class="field">
      <label for="cover_letter_text">Cover Letter</label>
      <textarea id="cover_letter_text" name="cover_letter_text" rows="5"></textarea>
    </div>

    <div class="field">
      <label>
        <input type="checkbox" id="terms_consent" name="terms_consent" required>
        I certify that all statements made in this application are true and correct. *
      </label>
    </div>

    <div class="field">
      <button type="submit" id="submit_app">Submit Application</button>
    </div>
  </form>
</body>
</html>`;

const LEVER_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Growth Product Manager - SaaS Unicorn</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 40px auto; }
    .field { margin-bottom: 16px; }
    label { display: block; font-weight: bold; margin-bottom: 6px; }
    input[type="text"], input[type="email"], input[type="tel"], textarea, select {
      width: 100%; padding: 8px; box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="posting-headline">
    <h2>Growth Product Manager</h2>
    <span class="org-name">SaaS Unicorn</span>
  </div>

  <div class="posting-description">
    <p>Lead product-led growth (PLG), funnel conversion rate optimization, onboarding experimentation, and monetization analytics.</p>
  </div>

  <form id="lever_form" action="/submit-lever" method="POST">
    <div class="field">
      <label>Full Name *</label>
      <input type="text" name="name" required>
    </div>

    <div class="field">
      <label>Email *</label>
      <input type="email" name="email" required>
    </div>

    <div class="field">
      <label>Phone *</label>
      <input type="tel" name="phone" required>
    </div>

    <div class="field">
      <label>Current Company</label>
      <input type="text" name="org">
    </div>

    <div class="field">
      <label>LinkedIn URL</label>
      <input type="text" name="urls[LinkedIn]">
    </div>

    <div class="field">
      <label>GitHub URL</label>
      <input type="text" name="urls[GitHub]">
    </div>

    <div class="field">
      <label>Resume / CV *</label>
      <input type="file" name="resume" required>
    </div>

    <div class="field">
      <label>Why are you interested in joining SaaS Unicorn? *</label>
      <textarea name="comments" rows="4" required></textarea>
    </div>

    <div class="field">
      <label>Gender (Voluntary EEO)</label>
      <select name="eeo[gender]">
        <option value="">Select an option</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Decline">Decline to self-identify</option>
      </select>
    </div>

    <div class="field">
      <button type="submit" class="submit-button">Submit application</button>
    </div>
  </form>
</body>
</html>`;

const IFRAME_CONTAINER_HTML = (port) => `<!DOCTYPE html>
<html>
<head>
  <title>Careers at Enterprise Portal</title>
</head>
<body>
  <h1>Apply for Openings</h1>
  <iframe src="http://localhost:${port}/greenhouse" id="job_frame" style="width: 100%; height: 900px; border: none;"></iframe>
</body>
</html>`;

const SUBMITTED_HTML = `<!DOCTYPE html>
<html>
<head><title>Application Received</title></head>
<body>
  <h1>Thank you for applying!</h1>
  <p id="confirmation_message">Your application has been received and our team will review it shortly.</p>
</body>
</html>`;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer((req, res) => {
      if (req.url === '/greenhouse') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(GREENHOUSE_HTML);
      } else if (req.url === '/lever') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(LEVER_HTML);
      } else if (req.url === '/iframe-ats') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(IFRAME_CONTAINER_HTML(serverPort));
      } else if (req.url === '/submit-greenhouse' || req.url === '/submit-lever') {
        // Collect POST body and return confirmation
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(SUBMITTED_HTML);
        });
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(0, () => {
      serverPort = server.address().port;
      baseUrl = `http://localhost:${serverPort}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

test('FormScanner detects all fields and context on Greenhouse mock', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/greenhouse`);

  const scan = await scanPageForForm(page);
  assert.equal(scan.hasForm, true);
  assert.equal(scan.jobTitle, 'Staff AI Product Manager');
  assert.equal(scan.companyName, 'NextGen AI');
  assert.ok(scan.fields.length >= 8);

  const fileInput = scan.fields.find(f => f.type === 'file');
  assert.ok(fileInput);
  assert.equal(fileInput.id, 'resume');

  const submit = scan.submitButton;
  assert.ok(submit);
  assert.equal(submit.text, 'Submit Application');

  await browser.close();
});

test('ApplyToJob in AUDIT mode scans form and generates audit report without modifying page', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const result = await applyToJob(page, `${baseUrl}/greenhouse`, {
    mode: 'audit'
  });

  assert.equal(result.status, 'AUDIT_COMPLETE');
  assert.equal(result.jobTitle, 'Staff AI Product Manager');
  assert.equal(result.targetResume.filename, 'Chetan_CV_Agentic_PM_V4.pdf');
  assert.ok(fs.existsSync(result.reportPath));

  // Verify form was untouched
  const val = await page.inputValue('#first_name');
  assert.equal(val, '');

  await browser.close();
  try { fs.unlinkSync(result.reportPath); } catch (e) {}
});

test('ApplyToJob in DRY-RUN mode populates all fields, attaches PDF resume, verifies and captures screenshot without submitting', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const result = await applyToJob(page, `${baseUrl}/greenhouse`, {
    mode: 'dry-run',
    slowMo: 50
  });

  assert.equal(result.status, 'DRY_RUN_SUCCESS');
  assert.equal(result.jobTitle, 'Staff AI Product Manager');
  assert.equal(result.companyName, 'NextGen AI');
  assert.ok(result.filledCount >= 7);
  assert.equal(result.failedCount, 0);

  // Verify field values populated in DOM
  const firstName = await page.inputValue('#first_name');
  assert.equal(firstName, 'Chetan');

  const lastName = await page.inputValue('#last_name');
  assert.equal(lastName, 'Singh');

  const email = await page.inputValue('#email');
  assert.equal(email, 'chetan.iimk20@gmail.com');

  const phone = await page.inputValue('#phone');
  assert.ok(phone.includes('8102046143'));

  const linkedin = await page.inputValue('#job_application_answers_attributes_0_text_value');
  assert.ok(linkedin.includes('linkedin.com/in/chetan-singh'));

  const authSelect = await page.inputValue('#authorized_in_india');
  assert.equal(authSelect, 'yes');

  const visaChecked = await page.isChecked('input[name="visa_sponsorship"][value="yes"]');
  assert.equal(visaChecked, true);

  const coverLetter = await page.inputValue('#cover_letter_text');
  assert.ok(coverLetter.includes('Dear Hiring Team'));
  assert.ok(coverLetter.includes('EvalAgent'));

  const termsChecked = await page.isChecked('#terms_consent');
  assert.equal(termsChecked, true);

  // Verify screenshot and report generated
  assert.ok(fs.existsSync(result.screenshotPath));
  assert.ok(fs.existsSync(result.reportPath));

  await browser.close();
  try {
    fs.unlinkSync(result.screenshotPath);
    fs.unlinkSync(result.reportPath);
  } catch (e) {}
});

test('ApplyToJob in LIVE mode submits form, captures confirmation, and completes end-to-end', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const result = await applyToJob(page, `${baseUrl}/greenhouse`, {
    mode: 'live',
    slowMo: 50
  });

  assert.equal(result.status, 'SUBMITTED');
  assert.equal(result.failedCount, 0);
  assert.ok(result.submissionScreenshot);
  assert.ok(fs.existsSync(result.submissionScreenshot));

  // Verify confirmation text reached on page
  const text = await page.innerText('body');
  assert.ok(text.includes('Thank you for applying'));

  await browser.close();
  try {
    if (result.screenshotPath) fs.unlinkSync(result.screenshotPath);
    if (result.submissionScreenshot) fs.unlinkSync(result.submissionScreenshot);
    if (result.reportPath) fs.unlinkSync(result.reportPath);
  } catch (e) {}
});

test('ApplyToJob on Lever mock selects Growth PM resume, answers custom question, and maps EEO', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const result = await applyToJob(page, `${baseUrl}/lever`, {
    mode: 'dry-run',
    slowMo: 50
  });

  assert.equal(result.status, 'DRY_RUN_SUCCESS');
  assert.equal(result.jobTitle, 'Growth Product Manager');
  assert.equal(result.targetResume.filename, 'Chetan_CV_Growth_PM_V4.pdf');
  assert.equal(result.failedCount, 0);

  const fullName = await page.inputValue('input[name="name"]');
  assert.equal(fullName, 'Chetan Singh');

  const comments = await page.inputValue('textarea[name="comments"]');
  assert.ok(comments.includes('SaaS Unicorn'));
  assert.ok(comments.includes('0-to-1'));

  const eeoGender = await page.inputValue('select[name="eeo[gender]"]');
  assert.equal(eeoGender, 'Male');

  await browser.close();
  try {
    if (result.screenshotPath) fs.unlinkSync(result.screenshotPath);
    if (result.reportPath) fs.unlinkSync(result.reportPath);
  } catch (e) {}
});

test('ApplyToJob detects and fills form embedded inside an iframe', async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const result = await applyToJob(page, `${baseUrl}/iframe-ats`, {
    mode: 'dry-run',
    slowMo: 50
  });

  assert.equal(result.status, 'DRY_RUN_SUCCESS');
  assert.ok(result.filledCount >= 7);

  // Check inside iframe
  const frame = page.frame({ url: /greenhouse/ });
  assert.ok(frame);
  const emailInFrame = await frame.inputValue('#email');
  assert.equal(emailInFrame, 'chetan.iimk20@gmail.com');

  await browser.close();
  try {
    if (result.screenshotPath) fs.unlinkSync(result.screenshotPath);
    if (result.reportPath) fs.unlinkSync(result.reportPath);
  } catch (e) {}
});
