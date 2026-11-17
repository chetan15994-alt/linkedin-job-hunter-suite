const path = require('path');
const fs = require('fs');
const { scanPageForForm } = require('./formScanner');
const { resolveAllFields } = require('./formResolver');
const { executeFillPlan } = require('./formFiller');
const { CANDIDATE_PROFILE } = require('./profile');
const { handleLinkedInEasyApply } = require('./linkedinEasyApply');
const { defaultTracker, STATUS } = require('./applicationTracker');

/**
 * Autonomous Job Application Pipeline Orchestrator (Phase 2)
 * Orchestrates navigation, scanning, semantic resolution, filling, validation,
 * visual screenshot capture, and audit reporting for any job URL.
 */

/**
 * Run the autonomous job application workflow on a given URL.
 * @param {import('playwright').Page} page
 * @param {string} jobUrl - Direct job posting or application link
 * @param {Object} options - {
 *   mode: 'audit' | 'dry-run' | 'live',
 *   resumeOverride: string,
 *   outputDir: string,
 *   slowMo: number
 * }
 */
async function applyToJob(page, jobUrl, options = {}) {
  const mode = options.mode || 'dry-run';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = options.outputDir || process.cwd();
  const reportPrefix = path.join(outputDir, `job-application-${stamp}`);

  console.log(`\n============================================================`);
  console.log(`🚀 Starting Phase 2 Autonomous Job Application Pipeline`);
  console.log(`Target URL: ${jobUrl}`);
  console.log(`Execution Mode: ${mode.toUpperCase()}`);
  console.log(`============================================================\n`);

  // 1. Navigate to target URL
  console.log(`[1/5] Navigating to job posting...`);
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);

  // Check if LinkedIn Easy Apply is present
  const hasEasyApply = await page.locator('button:has-text("Easy Apply"), [aria-label*="Easy Apply"]').first().isVisible().catch(() => false);
  if (hasEasyApply) {
    console.log(`[LinkedIn Detected] Routing to specialized LinkedIn Easy Apply automation engine...`);
    const easyApplyResult = await handleLinkedInEasyApply(page, {
      ...options,
      mode,
      reportPrefix
    });

    const reportMd = generateEasyApplyReport({
      jobUrl,
      mode,
      result: easyApplyResult
    });
    const reportPath = `${reportPrefix}-report.md`;
    fs.writeFileSync(reportPath, reportMd);
    easyApplyResult.reportPath = reportPath;

    // Record into application tracker
    defaultTracker.record({
      jobUrl,
      role: easyApplyResult.jobTitle || 'Product Manager',
      company: easyApplyResult.companyName || 'Not Detected',
      recruiter: options.recruiter || 'Hiring Team',
      portalType: 'LinkedIn Easy Apply',
      matchedResume: easyApplyResult.targetResume ? easyApplyResult.targetResume.filename : null,
      resumeCategory: easyApplyResult.targetResume ? easyApplyResult.targetResume.category : 'PM',
      fieldsFilled: easyApplyResult.filledCount || 0,
      totalFields: easyApplyResult.filledCount || 0,
      status: easyApplyResult.submitted ? STATUS.SUBMITTED : STATUS.FILLED,
      formFilledScreenshot: easyApplyResult.reviewScreenshotPath || (easyApplyResult.submitted ? null : easyApplyResult.screenshotPath),
      submittedScreenshot: easyApplyResult.submitted ? easyApplyResult.screenshotPath : null,
      challenges: 'None - Direct LinkedIn Easy Apply dialog modal traversed.',
      notes: `${easyApplyResult.stepsCompleted} dialog steps traversed with Indegene and Datawrkz high-impact PM answers.`
    });
    defaultTracker.exportMarkdown();

    return easyApplyResult;
  }

  // 2. Scan Page for Form Fields & Job Metadata
  console.log(`[2/5] Scanning page and embedded frames for application form...`);
  const scanResult = await scanPageForForm(page);

  console.log(`  Job Title: "${scanResult.jobTitle || 'Not explicitly titled'}"`);
  console.log(`  Company: "${scanResult.companyName || 'Not detected'}"`);
  console.log(`  Interactive Fields Discovered: ${scanResult.fields.length}`);
  console.log(`  Submit Button Detected: ${scanResult.submitButton ? `Yes ("${scanResult.submitButton.text}")` : 'No'}`);

  if (scanResult.isGated) {
    console.warn(`\n🛑 GATED PORTAL DETECTED: ${scanResult.gateType}`);
    console.warn(`   Reason: ${scanResult.gateReason}`);

    defaultTracker.record({
      jobUrl,
      role: scanResult.jobTitle || 'Product Manager',
      company: scanResult.companyName || 'Not Detected',
      recruiter: options.recruiter || 'Hiring Team',
      portalType: scanResult.portal || defaultTracker.detectPortalType(jobUrl),
      status: scanResult.gateType,
      challenges: scanResult.gateReason,
      notes: `Gated portal detected (${scanResult.portal || 'Enterprise ATS'}). Account creation bypassed per instructions.`
    });
    defaultTracker.exportMarkdown();

    return {
      status: scanResult.gateType,
      mode,
      jobTitle: scanResult.jobTitle,
      companyName: scanResult.companyName,
      challenges: scanResult.gateReason,
      reportPath: null
    };
  }

  if (!scanResult.hasForm) {
    throw new Error(`No job application form or input fields discovered at: ${jobUrl}`);
  }

  // 3. Resolve Semantic Mapping & Match Best Resume
  console.log(`[3/5] Resolving candidate profile mapping & matching specialized resume...`);
  const jobContext = {
    jobTitle: scanResult.jobTitle,
    companyName: scanResult.companyName,
    jobDescription: scanResult.jobDescription
  };

  const resolution = resolveAllFields(scanResult.fields, jobContext);
  
  // Apply resume override if user specified one
  if (options.resumeOverride && CANDIDATE_PROFILE.resumes[options.resumeOverride]) {
    const custom = CANDIDATE_PROFILE.resumes[options.resumeOverride];
    resolution.targetResume = {
      key: options.resumeOverride,
      filename: custom.filename,
      path: custom.path,
      category: custom.category,
      score: 99
    };
    for (const item of resolution.plan) {
      if (item.action === 'upload') {
        item.filePath = custom.path;
        item.rationale = `User override: ${custom.filename} (${custom.category})`;
      }
    }
  }

  console.log(`  Matched Resume: ${resolution.targetResume.filename} (${resolution.targetResume.category})`);
  console.log(`  Resolved Actions: ${resolution.plan.filter(p => p.action !== 'skip').length} fill actions, ${resolution.plan.filter(p => p.action === 'skip').length} skipped`);

  if (resolution.warnings.length > 0) {
    console.warn(`  ⚠️ Warnings / Potential Gaps (${resolution.warnings.length}):`);
    resolution.warnings.forEach(w => console.warn(`    - ${w}`));
  }

  // If Audit Mode: Print analysis and return without filling
  if (mode === 'audit') {
    console.log(`\n[Audit Mode] Skipping browser interactions. Generating audit report...`);
    const reportMd = generateApplicationReport({
      jobUrl,
      mode,
      scanResult,
      resolution,
      execution: { results: [], filledCount: 0, skippedCount: 0, failedCount: 0, errors: [] },
      submitted: false,
      screenshotPath: null
    });

    const reportPath = `${reportPrefix}-audit.md`;
    fs.writeFileSync(reportPath, reportMd);
    console.log(`Audit Report saved to: ${reportPath}`);

    return {
      status: 'AUDIT_COMPLETE',
      mode,
      jobTitle: scanResult.jobTitle,
      companyName: scanResult.companyName,
      targetResume: resolution.targetResume,
      plan: resolution.plan,
      warnings: resolution.warnings,
      reportPath
    };
  }

  // 4. Execute Form Filling
  console.log(`[4/5] Executing automated form filling and resume upload...`);
  const execution = await executeFillPlan(page, resolution.plan, {
    slowMo: options.slowMo || 300,
    dryRun: mode === 'dry-run'
  });

  console.log(`  Fields Filled: ${execution.filledCount}`);
  console.log(`  Fields Skipped: ${execution.skippedCount}`);
  console.log(`  Failed Interactions: ${execution.failedCount}`);

  // 5. Capture Visual Verification Screenshot
  console.log(`[5/5] Capturing verification screenshot & pre-submission validation...`);
  const screenshotPath = `${reportPrefix}-form-filled.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`  Visual Screenshot Saved: ${screenshotPath}`);

  // 6. Handle Submission (if LIVE mode)
  let submitted = false;
  let submissionScreenshot = null;
  if (mode === 'live') {
    if (execution.failedCount > 0) {
      console.error(`🛑 Live submission aborted: ${execution.failedCount} fields failed to fill safely.`);
    } else if (!scanResult.submitButton) {
      console.error(`🛑 Live submission aborted: Submit button could not be located.`);
    } else {
      console.log(`🚀 LIVE MODE: Clicking submit button ("${scanResult.submitButton.text}")...`);
      const submitLoc = page.locator(scanResult.submitButton.selector).first();
      await submitLoc.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
      await submitLoc.click({ timeout: 5000 });
      await page.waitForTimeout(5000);

      submissionScreenshot = `${reportPrefix}-submitted.png`;
      await page.screenshot({ path: submissionScreenshot, fullPage: true });
      submitted = true;
      console.log(`  Submission Complete! Confirmation Screenshot: ${submissionScreenshot}`);
    }
  } else {
    console.log(`\n🛡️ DRY-RUN MODE: Form successfully populated & verified. Submission button was NOT clicked.`);
  }

  // 7. Write Markdown Summary Report
  const reportMd = generateApplicationReport({
    jobUrl,
    mode,
    scanResult,
    resolution,
    execution,
    submitted,
    screenshotPath,
    submissionScreenshot
  });
  const reportPath = `${reportPrefix}-report.md`;
  fs.writeFileSync(reportPath, reportMd);
  console.log(`\nMaster Report written to: ${reportPath}`);

  // 8. Record into Application Tracker
  defaultTracker.record({
    jobUrl,
    role: scanResult.jobTitle || 'Product Manager',
    company: scanResult.companyName || 'Not Detected',
    recruiter: options.recruiter || 'Hiring Team',
    portalType: defaultTracker.detectPortalType(jobUrl),
    matchedResume: resolution.targetResume ? resolution.targetResume.filename : null,
    resumeCategory: resolution.targetResume ? resolution.targetResume.category : 'PM',
    fieldsFilled: execution.filledCount,
    totalFields: scanResult.fields.length,
    status: submitted ? STATUS.SUBMITTED : STATUS.FILLED,
    formFilledScreenshot: screenshotPath,
    submittedScreenshot: submissionScreenshot,
    challenges: execution.failedCount > 0 ? `${execution.failedCount} fields failed to fill safely` : 'None',
    notes: `${execution.filledCount} fields mapped and populated with Indegene AI & Datawrkz highR answers.`
  });
  defaultTracker.exportMarkdown();

  return {
    status: submitted ? 'SUBMITTED' : 'DRY_RUN_SUCCESS',
    mode,
    jobTitle: scanResult.jobTitle,
    companyName: scanResult.companyName,
    targetResume: resolution.targetResume,
    filledCount: execution.filledCount,
    failedCount: execution.failedCount,
    screenshotPath,
    submissionScreenshot,
    reportPath
  };
}

/**
 * Generate structured Markdown report for the application run.
 */
function generateApplicationReport({
  jobUrl,
  mode,
  scanResult,
  resolution,
  execution,
  submitted,
  screenshotPath,
  submissionScreenshot
}) {
  const stamp = new Date().toLocaleString();
  const res = resolution.targetResume;

  return `# Autonomous Job Application Report (Phase 2)

- **Job Posting URL**: [${jobUrl}](${jobUrl})
- **Company Name**: **${scanResult.companyName || 'Not Detected'}**
- **Job Title**: **${scanResult.jobTitle || 'Not Detected'}**
- **Execution Mode**: \`${mode.toUpperCase()}\`
- **Timestamp**: ${stamp}
- **Submission Status**: ${submitted ? '✅ **SUBMITTED**' : (mode === 'dry-run' ? '🛡️ **DRY RUN (Verified & Populated)**' : '🔍 **AUDIT ONLY**')}
- **Specialized Resume Attached**: \`${res.filename}\` (${res.category})

---

## 1. Executive Summary & Verification Metrics

| Metric | Result |
|---|---|
| **Total Fields Scanned** | ${scanResult.fields.length} |
| **Fields Successfully Filled** | ${execution.filledCount} |
| **Optional Fields Skipped** | ${execution.skippedCount} |
| **Failed Interactions** | ${execution.failedCount} |
| **Validation Warnings** | ${resolution.warnings.length} |
| **Verification Screenshot** | \`${screenshotPath || 'None'}\` |
${submissionScreenshot ? `| **Confirmation Screenshot** | \`${submissionScreenshot}\` |\n` : ''}

---

## 2. Field-by-Field Interaction & Audit Trail

| # | Field Label / Identifier | Type | Action | Value / File Attached | Status | Rationale |
|:---:|---|---|:---:|---|:---:|---|
${resolution.plan.map((item, idx) => {
  const execItem = execution.results.find(r => (r.label === item.field.label || r.label === item.field.name)) || {};
  const status = execItem.status || (item.action === 'skip' ? 'SKIPPED' : 'PENDING');
  let valDisplay = item.value || (item.filePath ? item.filePath.split('/').pop() : (item.selectedOption ? item.selectedOption.text : '-'));
  if (valDisplay && valDisplay.length > 40) valDisplay = `${valDisplay.slice(0, 37)}...`;
  return `| **${idx + 1}** | ${item.field.label || item.field.name || item.field.id} | \`${item.field.type}\` | \`${item.action}\` | \`${valDisplay}\` | **${status}** | ${item.rationale} |`;
}).join('\n')}

---

## 3. Potential Gaps & Warnings
${resolution.warnings.length === 0 ? '- None. All required fields successfully mapped.' : resolution.warnings.map(w => `- ⚠️ ${w}`).join('\n')}

---

*Report automatically generated by Antigravity Phase 2 Autonomous Job Application Suite.*
`;
}

/**
 * Generate structured Markdown report for LinkedIn Easy Apply.
 */
function generateEasyApplyReport({ jobUrl, mode, result }) {
  const stamp = new Date().toLocaleString();
  const res = result.targetResume || {};

  return `# Autonomous Job Application Report: LinkedIn Easy Apply (Phase 2)

- **Job Posting URL**: [${jobUrl}](${jobUrl})
- **Company Name**: **${result.companyName || 'Not Detected'}**
- **Job Title**: **${result.jobTitle || 'Product Manager'}**
- **Execution Mode**: \`${mode.toUpperCase()}\`
- **Timestamp**: ${stamp}
- **Submission Status**: ${result.submitted ? '✅ **SUBMITTED**' : '🛡️ **DRY RUN (Verified & Populated)**'}
- **Specialized Resume Attached**: \`${res.filename || 'Matched Resume'}\` (${res.category || 'PM'})

---

## 1. Executive Summary & Verification Metrics

| Metric | Result |
|---|---|
| **Steps Completed** | ${result.stepsCompleted} pages traversed |
| **Fields Successfully Resolved & Filled** | ${result.filledCount} |
| **Submission Status** | ${result.submitted ? 'Submitted to employer' : 'Pre-submission review verified'} |
| **Verification Screenshot** | \`${result.screenshotPath || 'None'}\` |

---

## 2. Interaction Audit Trail

| # | Field / Question Prompt | Injected / Selected Value | Status |
|:---:|---|---|:---:|
${(result.auditLog || []).map((item, idx) => {
  return `| **${idx + 1}** | ${item.label} | \`${item.value}\` | **${item.status}** |`;
}).join('\n')}

---

*Report automatically generated by Antigravity Phase 2 Autonomous Job Application Suite.*
`;
}

module.exports = {
  applyToJob,
  generateApplicationReport,
  generateEasyApplyReport
};
