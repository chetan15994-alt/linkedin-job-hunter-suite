const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ApplicationTracker, STATUS } = require('../src/applicationTracker');

test('ApplicationTracker initialization and empty state', () => {
  const tmpJson = path.join(os.tmpdir(), `tracker_test_${Date.now()}.json`);
  const tracker = new ApplicationTracker(tmpJson, os.tmpdir());
  assert.equal(tracker.records.length, 0);
  try { fs.unlinkSync(tmpJson); } catch (e) {}
});

test('ApplicationTracker records new application and auto-assigns ID and portal type', () => {
  const tmpJson = path.join(os.tmpdir(), `tracker_test_${Date.now()}.json`);
  const tracker = new ApplicationTracker(tmpJson, os.tmpdir());

  const rec = tracker.record({
    role: 'Lead AI Product Manager',
    company: 'Anthropic',
    recruiter: 'Sarah Jenkins',
    jobUrl: 'https://boards.greenhouse.io/anthropic/jobs/12345',
    matchedResume: 'Chetan_CV_Agentic_PM_V4.pdf',
    fieldsFilled: 12,
    totalFields: 12,
    status: STATUS.FILLED,
    formFilledScreenshot: '/tmp/test-filled.png'
  });

  assert.equal(rec.id, 'APP-001');
  assert.equal(rec.role, 'Lead AI Product Manager');
  assert.equal(rec.portalType, 'Greenhouse');
  assert.equal(rec.status, STATUS.FILLED);
  assert.equal(tracker.records.length, 1);

  // Update existing record by jobUrl
  const updated = tracker.record({
    jobUrl: 'https://boards.greenhouse.io/anthropic/jobs/12345',
    status: STATUS.SUBMITTED,
    submittedScreenshot: '/tmp/test-submitted.png'
  });

  assert.equal(updated.id, 'APP-001');
  assert.equal(updated.status, STATUS.SUBMITTED);
  assert.equal(updated.submittedScreenshot, '/tmp/test-submitted.png');
  assert.equal(tracker.records.length, 1);

  try { fs.unlinkSync(tmpJson); } catch (e) {}
});

test('ApplicationTracker detects various portal types accurately', () => {
  const tracker = new ApplicationTracker('/tmp/null.json', '/tmp');
  assert.equal(tracker.detectPortalType('https://www.linkedin.com/jobs/view/4489201038/'), 'LinkedIn Easy Apply');
  assert.equal(tracker.detectPortalType('https://precisiondev.bamboohr.com/careers/209'), 'BambooHR');
  assert.equal(tracker.detectPortalType('https://forms.gle/MUct5YNbywADVMUr8'), 'Google Forms');
  assert.equal(tracker.detectPortalType('https://jobs.lever.co/MissionWired/apply'), 'Lever');
  assert.equal(tracker.detectPortalType('https://cat.wd5.myworkdayjobs.com/careers/job/123'), 'Workday');
  assert.equal(tracker.detectPortalType('https://company.taleo.net/careersection/jobdetail.ftl'), 'Taleo');
});

test('ApplicationTracker generateMarkdown produces structured table with file links and challenges', () => {
  const tmpJson = path.join(os.tmpdir(), `tracker_test_${Date.now()}.json`);
  const tracker = new ApplicationTracker(tmpJson, os.tmpdir());

  tracker.record({
    role: 'Product Manager',
    company: 'Precision Dev',
    recruiter: 'Bhaumik Shah',
    jobUrl: 'https://precisiondev.bamboohr.com/careers/209',
    matchedResume: 'Chetan_Resume_-_Regulated_HealthTech_V4.pdf',
    fieldsFilled: 17,
    totalFields: 17,
    status: STATUS.FILLED,
    formFilledScreenshot: '/tmp/bamboo-filled.png'
  });

  tracker.record({
    role: 'Principal PM',
    company: 'Caterpillar',
    recruiter: 'Talent Acquisition',
    jobUrl: 'https://cat.wd5.myworkdayjobs.com/careers/job/cat-pm',
    matchedResume: 'Chetan_CV_B2BSaaS_PM_V4.pdf',
    fieldsFilled: 0,
    totalFields: 0,
    status: STATUS.ACCOUNT_CREATION_REQUIRED,
    challenges: 'Workday candidate portal requires sign-in / account registration before accessing form.'
  });

  const md = tracker.generateMarkdown();
  assert.ok(md.includes('# Autonomous Job Application & Submission Tracker (Phase 2)'));
  assert.ok(md.includes('Precision Dev'));
  assert.ok(md.includes('Caterpillar'));
  assert.ok(md.includes('ACCOUNT_REQUIRED'));
  assert.ok(md.includes('file://'));
  assert.ok(md.includes('Workday candidate portal requires sign-in'));

  // Verify export
  const outMd = path.join(os.tmpdir(), `tracker_export_${Date.now()}.md`);
  tracker.exportMarkdown(outMd);
  assert.ok(fs.existsSync(outMd));

  try { fs.unlinkSync(tmpJson); fs.unlinkSync(outMd); } catch (e) {}
});
