const { classifyField, resolveFieldValue, FIELD_TYPES } = require('./formResolver');
const { CANDIDATE_PROFILE, selectBestResume } = require('./profile');

/**
 * Autonomous LinkedIn Easy Apply Modal Automation Engine
 * Traverses multi-step LinkedIn `<dialog>` forms, resolves dynamic inputs,
 * selects/uploads matched resumes, answers screening questions, and handles final submission.
 */

async function handleLinkedInEasyApply(page, options = {}) {
  const mode = options.mode || 'dry-run';
  const slowMo = options.slowMo || 300;
  const maxSteps = options.maxSteps || 12;

  console.log(`\n[LinkedIn Easy Apply] Detecting application button...`);

  // Locate and click Easy Apply button
  const easyApplyBtn = page.locator('button:has-text("Easy Apply"), [aria-label*="Easy Apply"]').first();
  const isBtnVisible = await easyApplyBtn.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isBtnVisible) {
    throw new Error('Easy Apply button not found on this LinkedIn job posting.');
  }

  console.log(`[LinkedIn Easy Apply] Launching application modal...`);
  await easyApplyBtn.scrollIntoViewIfNeeded().catch(() => {});
  await easyApplyBtn.click();
  await page.waitForTimeout(2000);

  const dialog = page.locator('dialog');
  const isDialogVisible = await dialog.isVisible({ timeout: 6000 }).catch(() => false);
  if (!isDialogVisible) {
    throw new Error('LinkedIn Easy Apply dialog modal did not appear.');
  }

  // Detect job title and company from page context via evaluate for zero-latency return
  const meta = await page.evaluate(() => {
    const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, h1, [data-job-id]');
    const compEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, [class*="company-name"]');
    const descEl = document.querySelector('.jobs-description, .job-details');
    return {
      title: titleEl ? titleEl.innerText.trim() : 'Product Manager',
      company: compEl ? compEl.innerText.trim() : 'Company',
      description: descEl ? descEl.innerText.slice(0, 1000) : ''
    };
  });

  const jobContext = {
    jobTitle: meta.title,
    companyName: meta.company,
    jobDescription: meta.description
  };

  const matchedResume = selectBestResume(meta.description, meta.title);
  console.log(`  Job Role: "${jobContext.jobTitle}" at "${jobContext.companyName}"`);
  console.log(`  Matched CV: ${matchedResume.filename} (${matchedResume.category})`);

  let currentStep = 0;
  let filledFieldsCount = 0;
  const auditLog = [];

  while (currentStep < maxSteps) {
    currentStep++;
    console.log(`\n[Step ${currentStep}] Inspecting dialog step...`);

    // Check if final "Submit application" button is visible
    const submitBtn = dialog.locator('button:has-text("Submit application")').first();
    const isSubmitVisible = await submitBtn.isVisible().catch(() => false);

    if (isSubmitVisible) {
      console.log(`🎯 Final "Submit application" button reached!`);

      if (mode === 'live') {
        const reviewScreenshot = `${options.reportPrefix || 'job-application'}-form-filled.png`;
        await page.screenshot({ path: reviewScreenshot });
        console.log(`  Pre-submission Review Screenshot Saved: ${reviewScreenshot}`);

        console.log(`🚀 LIVE MODE: Clicking "Submit application"...`);
        await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
        await submitBtn.click({ timeout: 5000 });
        await page.waitForTimeout(4000);

        // Verification after submission
        const confirmationScreenshot = `${options.reportPrefix || 'job-application'}-submitted.png`;
        await page.screenshot({ path: confirmationScreenshot });
        console.log(`  Submission Complete! Confirmation Screenshot: ${confirmationScreenshot}`);

        // Close post-apply popup/modal if present
        const closeBtn = page.locator('button[aria-label="Dismiss"], button:has-text("Done")').first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click().catch(() => {});
        }

        return {
          status: 'SUBMITTED',
          mode,
          jobTitle: jobContext.jobTitle,
          companyName: jobContext.companyName,
          targetResume: matchedResume,
          filledCount: filledFieldsCount,
          submitted: true,
          reviewScreenshotPath: reviewScreenshot,
          screenshotPath: confirmationScreenshot,
          stepsCompleted: currentStep,
          auditLog
        };
      } else {
        console.log(`🛡️ DRY-RUN MODE: Review screen reached. Capturing verification screenshot without submitting.`);
        const reviewScreenshot = `${options.reportPrefix || 'job-application'}-form-filled.png`;
        await page.screenshot({ path: reviewScreenshot });
        console.log(`  Review Screenshot Saved: ${reviewScreenshot}`);

        // Dismiss modal cleanly
        const dismissBtn = dialog.locator('button[aria-label="Dismiss"]').first();
        if (await dismissBtn.isVisible().catch(() => false)) {
          await dismissBtn.click().catch(() => {});
          await page.waitForTimeout(1000);
          const discardBtn = page.locator('button:has-text("Discard")').first();
          if (await discardBtn.isVisible().catch(() => false)) {
            await discardBtn.click().catch(() => {});
          }
        }

        return {
          status: 'DRY_RUN_SUCCESS',
          mode,
          jobTitle: jobContext.jobTitle,
          companyName: jobContext.companyName,
          targetResume: matchedResume,
          filledCount: filledFieldsCount,
          submitted: false,
          screenshotPath: reviewScreenshot,
          stepsCompleted: currentStep,
          auditLog
        };
      }
    }

    // Process inputs on this step
    const fieldElements = await dialog.locator('input, select, textarea').all();

    for (const el of fieldElements) {
      const isVisible = await el.isVisible().catch(() => false);
      if (!isVisible) continue;

      const tag = await el.evaluate(e => e.tagName.toLowerCase());
      const type = await el.evaluate(e => e.type || '');
      const val = await el.inputValue().catch(() => '');

      // Determine label text
      const labelText = await el.evaluate(e => {
        let l = '';
        if (e.id) {
          const lbl = document.querySelector(`label[for="${e.id}"]`);
          if (lbl) l = lbl.innerText;
        }
        if (!l) {
          const parent = e.closest('.jobs-easy-apply-form-section, .fb-dash-form-element, fieldset, div');
          if (parent) {
            const lbl = parent.querySelector('label, legend, p, span');
            if (lbl) l = lbl.innerText;
          }
        }
        return (l || e.getAttribute('aria-label') || e.name || e.placeholder || '').trim();
      });

      // Handle radio / checkboxes
      if (type === 'radio' || type === 'checkbox') {
        const inFieldset = await el.evaluate(e => !!e.closest('fieldset'));
        if (inFieldset) {
          continue; // Handled specifically at fieldset level
        }

        const isChecked = await el.isChecked().catch(() => false);
        if (!isChecked) {
          if (/yes|agree|consent|certif|terms/i.test(labelText)) {
            await el.check({ force: true }).catch(() => {});
            filledFieldsCount++;
            auditLog.push({ label: labelText, value: 'Checked', status: 'FILLED' });
          }
        }
        continue;
      }

      // If empty, fill or select
      if (!val || val.length === 0) {
        let options = [];
        if (tag === 'select') {
          options = await el.evaluate(s => Array.from(s.options).map(o => ({ value: o.value, text: o.text })));
        }

        const dummyField = { label: labelText, name: labelText, placeholder: '', type, options };
        const classification = classifyField(dummyField);
        const resolved = resolveFieldValue(dummyField, classification, jobContext);

        if (tag === 'select') {
          if (resolved.selectedOption) {
            await el.selectOption(resolved.selectedOption.value).catch(() => {});
            filledFieldsCount++;
            auditLog.push({ label: labelText, value: resolved.selectedOption.text, status: 'FILLED' });
          }
        } else if (resolved.value) {
          await el.fill(String(resolved.value));
          await el.dispatchEvent('input');
          await el.dispatchEvent('change');
          filledFieldsCount++;
          auditLog.push({ label: labelText, value: String(resolved.value), status: 'FILLED' });
        }
      }
    }

    // Check affirmative fieldset options (e.g. Yes/No radio groups without input labels)
    const unselectedFieldsets = await dialog.locator('fieldset').all();
    for (const fs of unselectedFieldsets) {
      const fsContextText = await fs.evaluate(el => (el.parentElement ? el.parentElement.innerText : el.innerText) || '');
      if (/worked with.*us client|comfortable|experience|authorized|relocat|consent|agree/i.test(fsContextText) ||
          (fsContextText.includes('Yes') && fsContextText.includes('No'))) {
        const yesEl = fs.locator('p:has-text("Yes"), label:has-text("Yes"), input[value="Yes"]').first();
        if (await yesEl.isVisible().catch(() => false)) {
          await yesEl.click().catch(() => {});
          await page.waitForTimeout(300);
          filledFieldsCount++;
          auditLog.push({ label: fsContextText.split('\n')[0].trim(), value: 'Yes', status: 'FILLED' });
        }
      }
    }

    // Advance to next step
    const nextBtn = dialog.locator('button:has-text("Next"), button:has-text("Review")').first();
    const isNextVisible = await nextBtn.isVisible().catch(() => false);

    if (isNextVisible) {
      await nextBtn.scrollIntoViewIfNeeded().catch(() => {});
      await nextBtn.click();
      await page.waitForTimeout(slowMo || 1500);

      // Check if validation errors prevented advance and heal them immediately
      const errorEls = await dialog.locator('.artdeco-inline-feedback--error, [aria-invalid="true"]').allInnerTexts().catch(() => []);
      if (errorEls.length > 0) {
        console.warn(`⚠️ LinkedIn validation notices: ${errorEls.join('; ')}`);
        
        // Agentic inline healing for Easy Apply errors
        const errorFeedbackEls = await dialog.locator('.artdeco-inline-feedback--error').all();
        for (const errEl of errorFeedbackEls) {
          try {
            const parent = errEl.locator('xpath=..');
            
            // 1. Text / numeric / textarea input healing
            const inp = parent.locator('input[type="text"], input[type="number"], textarea').first();
            if (await inp.isVisible().catch(() => false)) {
              const val = await inp.inputValue().catch(() => '');
              if (!val || val.trim().length === 0) {
                const label = await parent.innerText().catch(() => '');
                if (/how\s*many\s*years|experience/i.test(label)) {
                  await inp.fill('5').catch(() => {});
                } else if (/notice/i.test(label)) {
                  await inp.fill('30').catch(() => {});
                } else if (/ctc|salary|compensation/i.test(label)) {
                  await inp.fill('40 LPA').catch(() => {});
                } else {
                  await inp.fill('Yes').catch(() => {});
                }
                await inp.dispatchEvent('input').catch(() => {});
                await inp.dispatchEvent('change').catch(() => {});
              }
            }

            // 2. Dropdown healing
            const sel = parent.locator('select').first();
            if (await sel.isVisible().catch(() => false)) {
              await sel.evaluate(s => {
                const opts = Array.from(s.options).filter(o => o.value && o.value !== '' && !o.disabled);
                if (opts.length > 0) {
                  const match = opts.find(o => /yes/i.test(o.text)) || opts[opts.length - 1];
                  s.value = match.value;
                  s.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }).catch(() => {});
            }

            // 3. Radio button healing
            const radios = parent.locator('input[type="radio"], [role="radio"]');
            if (await radios.count() > 0) {
              const yesRadio = parent.locator('label:has-text("Yes"), input[value="Yes"]').first();
              if (await yesRadio.isVisible().catch(() => false)) {
                await yesRadio.click().catch(() => {});
              } else {
                await radios.first().click().catch(() => {});
              }
            }
          } catch (healErr) {}
        }

        // Retry clicking next after healing validation gaps
        await page.waitForTimeout(500);
        await nextBtn.click().catch(() => {});
        await page.waitForTimeout(slowMo || 1500);
      }
    } else {
      console.warn('Neither Next nor Submit button found in modal.');
      break;
    }
  }

  // Dismiss if loop finishes without submitting
  const dismissBtn = dialog.locator('button[aria-label="Dismiss"]').first();
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click().catch(() => {});
    await page.waitForTimeout(500);
    const discardBtn = page.locator('button:has-text("Discard")').first();
    if (await discardBtn.isVisible().catch(() => false)) await discardBtn.click().catch(() => {});
  }

  return {
    status: 'INCOMPLETE',
    mode,
    jobTitle: jobContext.jobTitle,
    companyName: jobContext.companyName,
    targetResume: matchedResume,
    filledCount: filledFieldsCount,
    submitted: false,
    screenshotPath: null,
    stepsCompleted: currentStep,
    auditLog
  };
}

module.exports = {
  handleLinkedInEasyApply
};
