/**
 * Autonomous Self-Healing Form Submission Engine (Phase 2)
 * Handles universal submit button discovery, post-click validation error detection,
 * agentic error healing with positive/impactful candidate answers, multi-page progression,
 * and visual proof capture of employer confirmation screens across all ATS.
 */

const fs = require('fs');
const path = require('path');
const { classifyField, resolveFieldValue } = require('./formResolver');
const { CANDIDATE_PROFILE } = require('./profile');

/**
 * Universal Submit Selectors across Google Forms, BambooHR, Lever, Greenhouse, Ashby, and custom ATS.
 */
const SUBMIT_BUTTON_SELECTORS = [
  // Primary Specific Buttons (Prioritize exact submit buttons)
  'button:has-text("Submit Application")',
  'button:has-text("Submit application")',
  'button:has-text("SUBMIT APPLICATION")',
  'button:has-text("Send Application")',
  'button:has-text("Complete Application")',
  'button[data-testid="submit-button"]',
  'button#submit-application',
  '#submit_app',
  '#create-application',
  'input[type="submit"]',
  'button[type="submit"]',

  // Google Forms
  'div[role="button"][jsname]:has-text("Submit")',
  'div[role="button"]:has-text("Submit")',

  // Secondary Fallbacks
  'button:has-text("Apply Now")',
  'button:has-text("Submit")'
];

/**
 * Locates the primary submit or next-step button on the page.
 */
async function locateSubmitOrNextButton(page) {
  for (const sel of SUBMIT_BUTTON_SELECTORS) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        const text = await btn.innerText().catch(() => '');
        return { locator: btn, selector: sel, text: text.trim() };
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  // Fallback evaluate search
  return await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], div[role="button"], a[role="button"]'));
    for (const el of candidates) {
      const text = (el.innerText || el.value || '').trim().toLowerCase();
      if (/^(submit|submit\s+application|send\s+application|complete\s+application|apply)$/i.test(text)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { selector: el.id ? `#${el.id}` : null, text };
        }
      }
    }
    return null;
  });
}

/**
 * Verifies whether the application was successfully submitted.
 * Inspects URL redirects, confirmation banners, headings, and alert toasts.
 */
async function verifySubmissionSuccess(page) {
  const currentUrl = page.url().toLowerCase();

  // 1. URL pattern match
  if (currentUrl.includes('/thanks') ||
      currentUrl.includes('/thank-you') ||
      currentUrl.includes('/submitted') ||
      currentUrl.includes('/application-submitted') ||
      currentUrl.includes('/formresponse') ||
      currentUrl.includes('form_confirm') ||
      currentUrl.includes('/confirmation')) {
    return { isSubmitted: true, reason: `URL confirmed: ${currentUrl}` };
  }

  // 2. DOM text inspection
  return await page.evaluate(() => {
    const body = document.body ? document.body.innerText : '';

    const successPhrases = [
      'your response has been recorded',
      'your response has been submitted',
      'thank you for applying',
      'application submitted',
      'application sent',
      'application received',
      'we have received your application',
      'thanks for applying',
      'successfully submitted',
      'submission received',
      'thank you for your interest'
    ];

    for (const phrase of successPhrases) {
      if (body.toLowerCase().includes(phrase)) {
        return { isSubmitted: true, reason: `Confirmation text found: "${phrase}"` };
      }
    }

    // Check for modal dialogs with success state
    const dialog = document.querySelector('dialog, [role="dialog"], .modal, .confirmation-modal');
    if (dialog && /sent|submitted|received|thank you/i.test(dialog.innerText)) {
      return { isSubmitted: true, reason: `Confirmation dialog detected: "${dialog.innerText.slice(0, 80)}"` };
    }

    return { isSubmitted: false, reason: 'No confirmation signals detected.' };
  });
}

/**
 * Detects all visible validation errors or required field warnings on the page.
 */
async function detectValidationErrors(page) {
  return await page.evaluate(() => {
    const errors = [];

    // Google Forms error message containers
    const gfErrors = document.querySelectorAll('.freebirdFormviewerViewItemsItemErrorMessage, div[role="alert"]');
    for (const el of gfErrors) {
      if (el.innerText && el.innerText.trim().length > 0 && window.getComputedStyle(el).display !== 'none') {
        const questionContainer = el.closest('.freebirdFormviewerViewItemsItemItem, .Qr7Oae, [role="listitem"]');
        const prompt = questionContainer ? (questionContainer.querySelector('.M7eMe, [role="heading"]')?.innerText || '') : '';
        errors.push({
          type: 'google_forms',
          message: el.innerText.trim(),
          prompt: prompt.trim(),
          containerSelector: questionContainer ? (questionContainer.id ? `#${questionContainer.id}` : null) : null
        });
      }
    }

    // Generic ATS validation errors
    const genericErrors = document.querySelectorAll('.error, .has-error, .field-error, .artdeco-inline-feedback--error, [aria-invalid="true"]');
    for (const el of genericErrors) {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        const parent = el.closest('.field, .form-group, .application-question, fieldset, div');
        const prompt = parent ? (parent.querySelector('label, legend, h3, h4, p')?.innerText || '') : '';
        const msg = el.innerText || el.getAttribute('aria-errormessage') || 'Field validation required';
        errors.push({
          type: 'standard_ats',
          message: msg.trim(),
          prompt: prompt.trim()
        });
      }
    }

    return errors;
  });
}

/**
 * Intelligently heals detected validation errors by populating missing fields
 * with impactful answers anchored in Indegene & Datawrkz.
 */
async function healValidationErrors(page, errors = [], jobContext = {}) {
  console.log(`\n[Agentic Healer] Detected ${errors.length} validation errors on page. Healing...`);
  let healedCount = 0;

  for (const err of errors) {
    const prompt = (err.prompt || err.message || '').toLowerCase();
    console.log(`  Healing gap: "${err.prompt || err.message}"...`);

    // 1. Notice Period gap
    if (/notice|start\s*date|availability/i.test(prompt)) {
      const targetInput = page.locator('input[type="text"], input[type="number"], textarea').filter({ hasText: /notice/i }).first();
      if (await targetInput.count() > 0) {
        await targetInput.fill('30').catch(() => {});
        healedCount++;
      }
    }

    // 2. Compensation / CTC gap
    else if (/ctc|salary|compensation|expected/i.test(prompt)) {
      const inputs = await page.locator('input[type="text"], input[type="number"]').all();
      for (const inp of inputs) {
        const val = await inp.inputValue().catch(() => '');
        if (!val) {
          await inp.fill('40 LPA (Current: 29 LPA, 27L Fixed + 2L Variable)').catch(() => {});
          healedCount++;
          break;
        }
      }
    }

    // 3. Affirmative Choice / Agreement gap (radio / checkbox)
    else if (/authorized|visa|relocat|consent|agree|worked with/i.test(prompt)) {
      const yesBtn = page.locator('label:has-text("Yes"), input[value="Yes"], [role="radio"]:has-text("Yes")').first();
      if (await yesBtn.count() > 0 && await yesBtn.isVisible()) {
        await yesBtn.click().catch(() => {});
        healedCount++;
      }
    }

    // 4. Unselected <select> dropdowns (Greenhouse, Lever, standard ATS)
    const emptySelects = await page.locator('select').all();
    for (const sel of emptySelects) {
      try {
        const isVisible = await sel.isVisible().catch(() => false);
        if (!isVisible) continue;
        const val = await sel.inputValue().catch(() => '');
        if (!val || val === '--' || val === 'Select...' || val.length === 0) {
          await sel.evaluate((el) => {
            const opts = Array.from(el.options).filter(o => o.value && o.value !== '--' && o.value !== '');
            if (opts.length > 0) {
              const match = opts.find(o => /no|false/i.test(o.text)) || opts.find(o => /yes|true/i.test(o.text)) || opts[0];
              el.value = match.value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
          healedCount++;
        }
      } catch (e) {}
    }

    // 5. Autocomplete inputs (Greenhouse candidate location, school, Ashby)
    const comboboxes = await page.locator('#candidate-location, #school--0, input[role="combobox"], input[id*="location"], input[name*="location"]').all();
    for (const cb of comboboxes) {
      try {
        const isVisible = await cb.isVisible().catch(() => false);
        if (!isVisible) continue;
        const val = await cb.inputValue().catch(() => '');
        if (!val || val.trim().length === 0) {
          await cb.click().catch(() => {});
          await cb.fill('Bengaluru, Karnataka, India').catch(() => {});
          await page.waitForTimeout(600);
          await page.keyboard.press('ArrowDown').catch(() => {});
          await page.keyboard.press('Enter').catch(() => {});
          healedCount++;
        }
      } catch (e) {}
    }

    // 6. General Empty Required Inputs in Error Containers
    const emptyInputs = await page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea').all();
    for (const inp of emptyInputs) {
      const isVisible = await inp.isVisible().catch(() => false);
      if (!isVisible) continue;
      const val = await inp.inputValue().catch(() => '');
      if (!val || val.trim().length === 0) {
        // Generate impactful positive PM answer
        const fallbackText = "At Indegene, I built EvalAgent to evaluate multi-turn LLM agent workflows, improving agreement to 85%, and architected COCKPIT QA agent achieving 4x test surface coverage. Previously at Datawrkz, I scaled our B2B SaaS platform highR 3x ARR. I bring strong product execution and technical rigor.";
        await inp.fill(fallbackText).catch(() => {});
        await inp.dispatchEvent('input').catch(() => {});
        await inp.dispatchEvent('change').catch(() => {});
        healedCount++;
      }
    }

    // 7. Unselected Checkboxes (Google Forms multi-role choices, agreements)
    const unselectedCheckboxes = await page.locator('[role="checkbox"][aria-checked="false"], input[type="checkbox"]:not(:checked)').all();
    for (const cb of unselectedCheckboxes) {
      const ariaLabel = (await cb.getAttribute('aria-label').catch(() => '')) || '';
      const text = (await cb.innerText().catch(() => '')) || '';
      const combined = `${ariaLabel} ${text}`.toLowerCase();
      if (/product|ai|founder|general|growth|manager|director|agree|consent|terms/i.test(combined) || unselectedCheckboxes.indexOf(cb) === 0) {
        console.log(`    [Healer] Selecting required checkbox option: "${ariaLabel || text}"`);
        await cb.click({ force: true }).catch(() => {});
        healedCount++;
        break;
      }
    }

    // 6. Unselected Google Forms / Custom Radio Groups
    const unselectedRadios = await page.locator('[role="radio"][aria-checked="false"], input[type="radio"]:not(:checked)').all();
    if (unselectedRadios.length > 0) {
      // Click first affirmative radio
      for (const r of unselectedRadios) {
        const text = await r.innerText().catch(() => '');
        if (/yes|agree|positive|daily|active/i.test(text) || unselectedRadios.indexOf(r) === 0) {
          await r.click({ force: true }).catch(() => {});
          healedCount++;
          break;
        }
      }
    }
  }

  return healedCount;
}

/**
 * Autonomous Full Form Submission with Multi-Cycle Self-Healing
 */
async function executeAutonomousSubmission(page, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const reportPrefix = options.reportPrefix || path.join(process.cwd(), `job-app-${Date.now()}`);
  const jobContext = options.jobContext || {};

  console.log(`\n============================================================`);
  console.log(`🚀 [Submission Engine] Executing Live Form Submission & Verification`);
  console.log(`============================================================`);

  // 1. Pre-submission review screenshot
  const filledScreenshot = `${reportPrefix}-form-filled.png`;
  await page.screenshot({ path: filledScreenshot, fullPage: true }).catch(() => {});
  console.log(`📸 Pre-submission Review Proof Saved: ${filledScreenshot}`);

  let currentAttempt = 0;
  let isSuccessfullySubmitted = false;
  let submissionProof = null;
  const healingAudit = [];

  while (currentAttempt < maxRetries) {
    currentAttempt++;
    console.log(`\n[Attempt ${currentAttempt}/${maxRetries}] Locating submit button...`);

    const submitBtn = await locateSubmitOrNextButton(page);
    if (!submitBtn) {
      console.warn(`Submit button could not be located on attempt ${currentAttempt}.`);
      break;
    }

    console.log(`Clicking submit button ("${submitBtn.text || submitBtn.selector}")...`);
    if (submitBtn.locator) {
      await submitBtn.locator.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
      await submitBtn.locator.click({ timeout: 5000 }).catch(async () => {
        await submitBtn.locator.click({ force: true }).catch(() => {});
      });
    } else if (submitBtn.selector) {
      await page.click(submitBtn.selector, { timeout: 5000, force: true }).catch(() => {});
    }

    console.log(`Waiting for confirmation signals (4s)...`);
    await page.waitForTimeout(4000);

    // Check submission success
    const verifyResult = await verifySubmissionSuccess(page);
    if (verifyResult.isSubmitted) {
      console.log(`🎯 SUBMISSION CONFIRMED: ${verifyResult.reason}`);
      submissionProof = `${reportPrefix}-submitted.png`;
      await page.screenshot({ path: submissionProof, fullPage: true });
      console.log(`📸 Live Confirmation Screenshot Captured: ${submissionProof}`);
      isSuccessfullySubmitted = true;
      break;
    }

    // Inspect validation errors
    console.warn(`Submission not confirmed yet. Checking for validation errors...`);
    const errors = await detectValidationErrors(page);

    if (errors.length > 0) {
      console.warn(`Found ${errors.length} validation errors preventing submission.`);
      const healed = await healValidationErrors(page, errors, jobContext);
      healingAudit.push({ attempt: currentAttempt, errorsCount: errors.length, healedCount: healed });
      await page.waitForTimeout(1000);
    } else {
      console.log(`No active validation errors visible. Checking if next page loaded...`);
      // If a multi-step form, continue loop
    }
  }

  return {
    submitted: isSuccessfullySubmitted,
    status: isSuccessfullySubmitted ? 'SUBMITTED' : 'FILLED',
    formFilledScreenshot: filledScreenshot,
    submittedScreenshot: submissionProof,
    attempts: currentAttempt,
    healingAudit
  };
}

module.exports = {
  locateSubmitOrNextButton,
  verifySubmissionSuccess,
  detectValidationErrors,
  healValidationErrors,
  executeAutonomousSubmission,
  SUBMIT_BUTTON_SELECTORS
};
