const fs = require('fs');

/**
 * Playwright Form Filling Execution Engine
 * Executes automated, human-like interaction with form inputs, native selects,
 * custom comboboxes, radio buttons, checkboxes, and file uploads across main page and iframes.
 */

/**
 * Execute the fill plan on the active Playwright page.
 * @param {import('playwright').Page} page
 * @param {Array<Object>} plan - Resolved fill plan items from formResolver.
 * @param {Object} options - { slowMo: number, dryRun: boolean }
 * @returns {Promise<{
 *   results: Array<Object>,
 *   filledCount: number,
 *   skippedCount: number,
 *   failedCount: number,
 *   errors: Array<string>
 * }>}
 */
async function executeFillPlan(page, plan = [], options = {}) {
  const results = [];
  const errors = [];
  let filledCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const frames = page.frames();

  for (const item of plan) {
    const { field, action, value, filePath, selectedOption, rationale } = item;

    if (action === 'skip') {
      results.push({
        label: field.label || field.name || field.id,
        type: field.type,
        action: 'skip',
        status: 'SKIPPED',
        detail: rationale
      });
      skippedCount++;
      continue;
    }

    console.log(`    -> [${action}] ${field.label || field.name || field.id}`);
    const frame = frames[field.frameIndex] || page;

    try {
      const locator = findElementLocator(frame, field);

      if (action === 'type') {
        await fillTextInput(locator, value, field);
        results.push({
          label: field.label || field.name || field.id,
          type: field.type,
          action: 'type',
          value: value.length > 50 ? `${value.slice(0, 47)}...` : value,
          status: 'FILLED',
          detail: rationale
        });
        filledCount++;
      } else if (action === 'upload') {
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found on disk: ${filePath}`);
        }
        await uploadFile(locator, filePath, field);
        results.push({
          label: field.label || field.name || field.id,
          type: 'file',
          action: 'upload',
          value: item.field.filename || filePath.split('/').pop(),
          status: 'UPLOADED',
          detail: rationale
        });
        filledCount++;
      } else if (action === 'select') {
        await selectOption(frame, locator, selectedOption, field);
        results.push({
          label: field.label || field.name || field.id,
          type: 'select',
          action: 'select',
          value: selectedOption ? selectedOption.text : '',
          status: 'SELECTED',
          detail: rationale
        });
        filledCount++;
      } else if (action === 'radio') {
        await selectRadioButton(frame, locator, selectedOption, field);
        results.push({
          label: field.label || field.name || field.id,
          type: 'radio',
          action: 'radio',
          value: selectedOption ? selectedOption.text : '',
          status: 'CHECKED',
          detail: rationale
        });
        filledCount++;
      } else if (action === 'check') {
        await toggleCheckbox(frame, locator, field);
        results.push({
          label: field.label || field.name || field.id,
          type: 'checkbox',
          action: 'check',
          value: 'true',
          status: 'CHECKED',
          detail: rationale
        });
        filledCount++;
      }
    } catch (err) {
      const errMsg = `Failed to fill "${field.label || field.name || field.id}": ${err.message}`;
      errors.push(errMsg);
      results.push({
        label: field.label || field.name || field.id,
        type: field.type,
        action,
        status: 'FAILED',
        error: err.message,
        detail: rationale
      });
      failedCount++;
    }

    if (options.slowMo) {
      await page.waitForTimeout(options.slowMo);
    }
  }

  return {
    results,
    filledCount,
    skippedCount,
    failedCount,
    errors
  };
}

/**
 * Safe CSS selector escaping for Node.js environment.
 */
function escapeCss(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

function isDynamicId(id = '') {
  if (!id) return true;
  return /^(fabric|ember|react|jsx|radix|headlessui|mantine|mui|aria|_|f-)/i.test(id) ||
         /field-\d+|select\d+|input-\d+|textfield-\d+/i.test(id);
}

/**
 * Locate element using robust cascading fallbacks, prioritizing stable names over dynamic IDs.
 */
function findElementLocator(frame, field) {
  // 1. Stable Name attribute
  if (field.name && !isDynamicId(field.name)) {
    return frame.locator(`[name="${escapeCss(field.name)}"]`).first();
  }
  // 2. Stable Non-dynamic ID
  if (field.id && !isDynamicId(field.id)) {
    return frame.locator(`#${escapeCss(field.id)}`).first();
  }
  // 3. Field Label
  if (field.label) {
    const cleanLabel = field.label.replace(/[*:\s]+$/, '').trim();
    if (cleanLabel.length > 2) {
      return frame.getByLabel(cleanLabel, { exact: false }).first();
    }
  }
  // 4. Fallback to ID
  if (field.id) {
    return frame.locator(`#${escapeCss(field.id)}`).first();
  }
  // 5. Selector
  if (field.selector) {
    return frame.locator(field.selector).first();
  }
  if (field.placeholder) {
    return frame.getByPlaceholder(field.placeholder, { exact: false }).first();
  }
  throw new Error(`Cannot construct locator for field: ${JSON.stringify(field)}`);
}

/**
 * Fill text, email, phone, or textarea input.
 */
async function fillTextInput(locator, textValue, field) {
  await locator.scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => {});

  if (field.tagName === 'select' || field.type === 'select') {
    await locator.evaluate((sel, targetText) => {
      const lower = targetText.toLowerCase();
      const options = Array.from(sel.options);
      let match = options.find(o => o.text.trim().toLowerCase() === lower || o.value.toLowerCase() === lower);
      if (!match) {
        match = options.find(o => o.text.toLowerCase().includes(lower) || lower.includes(o.text.toLowerCase()));
      }
      if (match) {
        sel.value = match.value;
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, String(textValue)).catch(() => {});
    return;
  }

  await locator.click({ timeout: 2500 }).catch(() => {});
  await locator.fill(String(textValue), { timeout: 2500 });
  
  // Fire change and blur events to trigger client validation (React/Vue/Ember)
  await locator.dispatchEvent('input').catch(() => {});
  await locator.dispatchEvent('change').catch(() => {});
  await locator.dispatchEvent('blur').catch(() => {});
}

/**
 * Upload file to <input type="file">.
 * Handles both visible and hidden styled dropzones.
 */
async function uploadFile(locator, filePath, field) {
  await locator.first().setInputFiles(filePath, { timeout: 5000 }).catch(async () => {
    await locator.setInputFiles(filePath).catch(() => {});
  });
}

/**
 * Select option in native <select> or custom dropdown.
 */
async function selectOption(frame, locator, selectedOption, field) {
  if (!selectedOption) return;

  if (field.tagName === 'select') {
    await locator.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    
    // Try selecting by value first, then label
    const valSuccess = await locator.selectOption({ value: selectedOption.value }, { timeout: 3000 }).catch(() => null);
    if (!valSuccess && selectedOption.text) {
      await locator.selectOption({ label: selectedOption.text }, { timeout: 3000 }).catch(() => null);
    }
    await locator.dispatchEvent('change').catch(() => {});
  } else {
    // Custom combobox (React-Select, Radix, ARIA listbox)
    await locator.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    await locator.click({ timeout: 4000 });
    await frame.waitForTimeout(400);

    // Look for matching option in the popup list
    const optionLocator = frame.locator('[role="option"], .select__option, li, div[class*="option"]').filter({
      hasText: new RegExp(`^\\s*${escapeRegExp(selectedOption.text)}\\s*$`, 'i')
    }).first();

    const count = await optionLocator.count();
    if (count > 0) {
      await optionLocator.click({ timeout: 3000 });
    } else {
      // Type into combobox and hit Enter
      await locator.type(selectedOption.text, { delay: 50 });
      await frame.keyboard.press('Enter');
    }
  }
}

/**
 * Select matching radio button in group.
 */
async function selectRadioButton(frame, groupLocator, selectedOption, field) {
  if (!selectedOption) return;

  let targetRadio = null;
  if (selectedOption.id) {
    targetRadio = frame.locator(`#${escapeCss(selectedOption.id)}`);
  } else if (field.name && selectedOption.value) {
    targetRadio = frame.locator(`input[type="radio"][name="${escapeCss(field.name)}"][value="${escapeCss(selectedOption.value)}"]`);
  } else if (selectedOption.selector) {
    targetRadio = frame.locator(selectedOption.selector);
  }

  if (targetRadio) {
    await targetRadio.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    
    // Check if directly clickable or click associated label
    const checked = await targetRadio.check({ force: true, timeout: 3000 }).catch(() => false);
    if (!checked && selectedOption.id) {
      const label = frame.locator(`label[for="${escapeCss(selectedOption.id)}"]`);
      if (await label.count() > 0) {
        await label.click({ timeout: 3000 }).catch(() => {});
      }
    }
  }
}

/**
 * Toggle or check checkbox.
 */
async function toggleCheckbox(frame, locator, field) {
  await locator.first().scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => {});
  const isChecked = await locator.first().evaluate(el => {
    return el.checked === true || el.getAttribute('aria-checked') === 'true';
  }).catch(() => false);

  if (!isChecked) {
    const clicked = await locator.first().click({ force: true, timeout: 2500 }).catch(() => false);
    if (!clicked && field.id) {
      const label = frame.locator(`label[for="${escapeCss(field.id)}"]`).first();
      if (await label.count() > 0) {
        await label.click({ timeout: 2000 }).catch(() => {});
      }
    }
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  executeFillPlan,
  findElementLocator,
  fillTextInput,
  uploadFile,
  selectOption,
  selectRadioButton,
  toggleCheckbox
};
