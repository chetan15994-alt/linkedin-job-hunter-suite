/**
 * Form Scanner & DOM Inspector
 * Scans web pages and iframes to discover, categorize, and extract structured metadata
 * for all interactive job application form controls across major ATS (Greenhouse, Lever,
 * Ashby, Workable, SmartRecruiters, custom career portals).
 */

/**
 * Scan a Playwright page (and its iframes) for job application forms and interactive fields.
 * @param {import('playwright').Page} page
 * @returns {Promise<{
 *   hasForm: boolean,
 *   pageTitle: string,
 *   jobTitle: string,
 *   companyName: string,
 *   jobDescription: string,
 *   fields: Array<Object>,
 *   applyButtonFound: boolean,
 *   submitButton: Object|null
 * }>}
 */
async function scanPageForForm(page) {
  // 1. Extract job title, company, and job description for intelligent context
  const meta = await extractJobContext(page);

  // 2. Check if an "Apply Now" button needs to be clicked to reveal or navigate to the form
  const applyButtonFound = await ensureFormVisible(page);

  // 3. Scan main page and all child frames for form fields
  const allFields = [];
  const frames = page.frames();

  for (let fIndex = 0; fIndex < frames.length; fIndex++) {
    const frame = frames[fIndex];
    try {
      const frameFields = await scanFrameFields(frame, fIndex);
      allFields.push(...frameFields);
    } catch (err) {
      // Ignore detached or cross-origin restricted frames
    }
  }

  // 4. Locate submit button
  const submitButton = await locateSubmitButton(page);

  return {
    hasForm: allFields.length > 0,
    pageTitle: meta.pageTitle,
    jobTitle: meta.jobTitle,
    companyName: meta.companyName,
    jobDescription: meta.jobDescription,
    fields: allFields,
    applyButtonFound,
    submitButton
  };
}

/**
 * Extract job context (title, company, description) from page DOM.
 */
async function extractJobContext(page) {
  return await page.evaluate(() => {
    const pageTitle = document.title || '';
    
    // Look for common job title headings
    const titleSelectors = [
      'h1.app-title', '.job-title', 'h1[class*="title"]', 'h1[class*="job"]',
      '.posting-headline h2', '[data-qa="job-title"]', 'h1'
    ];
    let jobTitle = '';
    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 2) {
        jobTitle = el.innerText.trim();
        break;
      }
    }

    // Look for company name
    const companySelectors = [
      '.company-name', '[data-qa="company-name"]', '.org-name',
      '.posting-headline h2 + span', 'header a[href="/"]', 'header img[alt]'
    ];
    let companyName = '';
    for (const sel of companySelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.innerText || el.getAttribute('alt') || '';
        if (text.trim().length > 1) {
          companyName = text.trim();
          break;
        }
      }
    }

    // Fallback company from title or URL
    if (!companyName) {
      const host = window.location.hostname.replace(/^www\./, '');
      const parts = host.split('.');
      if (parts.length >= 2 && !['greenhouse', 'lever', 'ashbyhq', 'workable'].includes(parts[0])) {
        companyName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }

    // Extract body / job description text
    const descSelectors = [
      '#content', '.job-description', '.posting-description',
      '[data-qa="job-description"]', '#job-description', 'article', 'main'
    ];
    let jobDescription = '';
    for (const sel of descSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 50) {
        jobDescription = el.innerText.slice(0, 3000).trim();
        break;
      }
    }

    if (!jobDescription) {
      jobDescription = document.body ? document.body.innerText.slice(0, 2000) : '';
    }

    return { pageTitle, jobTitle, companyName, jobDescription };
  });
}

/**
 * If form is hidden behind an "Apply" button or anchor, click it to scroll or reveal.
 */
async function ensureFormVisible(page) {
  try {
    const applyButton = page.locator('a, button, [role="button"]').filter({
      hasText: /^(apply(\s+now|\s+for\s+this\s+job)?|submit\s+application)$/i
    }).first();

    const count = await applyButton.count();
    if (count > 0 && await applyButton.isVisible()) {
      // Check if a form is already visible on page
      const hasVisibleForm = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
        return inputs.length >= 3;
      });

      if (!hasVisibleForm) {
        await applyButton.click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(1500);
        return true;
      }
    }
  } catch (e) {
    // Non-fatal
  }
  return false;
}

/**
 * Scan a single frame (main document or iframe) for all actionable fields.
 */
async function scanFrameFields(frame, frameIndex) {
  return await frame.evaluate((fIndex) => {
    const results = [];

    // Helper to find associated label for any element
    function getLabelText(el) {
      let label = '';
      
      // 1. <label for="id">
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (labelEl && labelEl.innerText) {
          label = labelEl.innerText.trim();
        }
      }

      // 2. Parent <label>
      if (!label) {
        const parentLabel = el.closest('label');
        if (parentLabel && parentLabel.innerText) {
          label = parentLabel.innerText.trim();
        }
      }

      // 3. aria-labelledby
      if (!label && el.getAttribute('aria-labelledby')) {
        const ids = el.getAttribute('aria-labelledby').split(/\s+/);
        const texts = ids.map(id => {
          const target = document.getElementById(id);
          return target ? target.innerText.trim() : '';
        }).filter(Boolean);
        if (texts.length) label = texts.join(' ');
      }

      // 4. aria-label
      if (!label && el.getAttribute('aria-label')) {
        label = el.getAttribute('aria-label').trim();
      }

      // 5. Preceding heading, label-like sibling or fieldset legend
      if (!label) {
        const fieldset = el.closest('fieldset');
        if (fieldset) {
          const legend = fieldset.querySelector('legend');
          if (legend && legend.innerText) label = legend.innerText.trim();
        }
      }

      // 6. Closest previous text node or div with text
      if (!label) {
        const container = el.closest('.field, .form-group, .input-container, [class*="field"], [class*="form-item"]');
        if (container) {
          const titleEl = container.querySelector('.label, label, span, p, h3, h4');
          if (titleEl && titleEl !== el && titleEl.innerText) {
            label = titleEl.innerText.trim();
          }
        }
      }

      // 7. Fallback to placeholder or name
      if (!label) {
        label = el.getAttribute('placeholder') || el.getAttribute('name') || '';
      }

      return label.replace(/\s+/g, ' ').trim();
    }

    // Helper to test if element is required
    function isElementRequired(el, labelText) {
      if (el.required || el.getAttribute('required') !== null) return true;
      if (el.getAttribute('aria-required') === 'true') return true;
      if (/\*|required/i.test(labelText)) return true;
      const parent = el.closest('.field, .form-group, [class*="field"]');
      if (parent && /\*|required/i.test(parent.innerText)) return true;
      return false;
    }

    // 1. Text, Email, Tel, URL, Number, Textarea inputs
    const textLikeInputs = Array.from(document.querySelectorAll('input, textarea'));
    for (const el of textLikeInputs) {
      const type = (el.getAttribute('type') || (el.tagName === 'TEXTAREA' ? 'textarea' : 'text')).toLowerCase();
      
      // Skip hidden, submit, button, image, radio, checkbox, file (handled separately)
      if (['submit', 'button', 'reset', 'image', 'hidden', 'radio', 'checkbox', 'file'].includes(type)) {
        continue;
      }

      // Check if visually hidden or zero-sized (unless in accessible forms)
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      const label = getLabelText(el);
      const isReq = isElementRequired(el, label);

      results.push({
        frameIndex: fIndex,
        tagName: el.tagName.toLowerCase(),
        type,
        id: el.id || '',
        name: el.name || '',
        placeholder: el.placeholder || '',
        autocomplete: el.autocomplete || '',
        label,
        required: isReq,
        value: el.value || '',
        selector: el.id ? `#${el.id}` : (el.name ? `${el.tagName.toLowerCase()}[name="${el.name}"]` : null)
      });
    }

    // 2. File Inputs (Resume, Cover Letter, Portfolio uploads)
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    for (const el of fileInputs) {
      const label = getLabelText(el) || 'Upload File / Resume';
      const isReq = isElementRequired(el, label);
      const accept = el.getAttribute('accept') || '';

      results.push({
        frameIndex: fIndex,
        tagName: 'input',
        type: 'file',
        id: el.id || '',
        name: el.name || '',
        placeholder: '',
        autocomplete: '',
        label,
        required: isReq,
        accept,
        selector: el.id ? `#${el.id}` : (el.name ? `input[type="file"][name="${el.name}"]` : 'input[type="file"]')
      });
    }

    // 3. Native Select Elements
    const selects = Array.from(document.querySelectorAll('select'));
    for (const el of selects) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' && !el.classList.contains('hidden-accessible')) {
        // Some libraries hide native select but keep it accessible
      }

      const label = getLabelText(el);
      const isReq = isElementRequired(el, label);
      const options = Array.from(el.options).map(o => ({
        value: o.value,
        text: (o.text || o.innerText || '').trim(),
        disabled: o.disabled
      })).filter(o => o.text.length > 0);

      results.push({
        frameIndex: fIndex,
        tagName: 'select',
        type: 'select',
        id: el.id || '',
        name: el.name || '',
        placeholder: '',
        autocomplete: '',
        label,
        required: isReq,
        value: el.value || '',
        options,
        selector: el.id ? `#${el.id}` : (el.name ? `select[name="${el.name}"]` : null)
      });
    }

    // 4. Radio Button Groups
    const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
    const radioGroups = {};
    for (const el of radios) {
      const groupKey = el.name || el.closest('fieldset')?.id || 'anonymous_radio_group';
      if (!radioGroups[groupKey]) {
        radioGroups[groupKey] = [];
      }
      radioGroups[groupKey].push(el);
    }

    for (const [groupName, groupEls] of Object.entries(radioGroups)) {
      const first = groupEls[0];
      const groupLabel = getLabelText(first) || groupName;
      const isReq = groupEls.some(r => isElementRequired(r, groupLabel));

      const options = groupEls.map(r => {
        let optLabel = '';
        if (r.id) {
          const l = document.querySelector(`label[for="${CSS.escape(r.id)}"]`);
          if (l) optLabel = l.innerText.trim();
        }
        if (!optLabel) {
          const p = r.closest('label');
          if (p) optLabel = p.innerText.trim();
        }
        if (!optLabel) optLabel = r.value;
        return {
          value: r.value,
          text: optLabel,
          checked: r.checked,
          id: r.id || '',
          selector: r.id ? `#${r.id}` : `input[type="radio"][name="${r.name}"][value="${r.value}"]`
        };
      });

      results.push({
        frameIndex: fIndex,
        tagName: 'input',
        type: 'radio_group',
        id: first.id || '',
        name: groupName,
        label: groupLabel,
        required: isReq,
        options,
        selector: first.name ? `input[type="radio"][name="${first.name}"]` : null
      });
    }

    // 5. Checkboxes (agreements, acknowledgements, certifications)
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    for (const el of checkboxes) {
      const label = getLabelText(el);
      const isReq = isElementRequired(el, label);

      results.push({
        frameIndex: fIndex,
        tagName: 'input',
        type: 'checkbox',
        id: el.id || '',
        name: el.name || '',
        label,
        required: isReq,
        checked: el.checked,
        selector: el.id ? `#${el.id}` : (el.name ? `input[type="checkbox"][name="${el.name}"]` : null)
      });
    }

    // 6. Custom ARIA comboboxes / Select controls (React-Select, Headless UI, Radix)
    const customSelects = Array.from(document.querySelectorAll('[role="combobox"], [aria-haspopup="listbox"], .select__control'));
    for (const el of customSelects) {
      if (results.some(r => r.id === el.id && r.id.length > 0)) continue;
      const label = getLabelText(el);
      const isReq = isElementRequired(el, label);

      results.push({
        frameIndex: fIndex,
        tagName: el.tagName.toLowerCase(),
        type: 'custom_combobox',
        id: el.id || '',
        name: el.getAttribute('name') || '',
        label,
        required: isReq,
        selector: el.id ? `#${el.id}` : (el.getAttribute('name') ? `[name="${el.getAttribute('name')}"]` : null)
      });
    }

    return results;
  }, frameIndex);
}

/**
 * Locate the primary Submit / Apply button on the page.
 */
async function locateSubmitButton(page) {
  try {
    return await page.evaluate(() => {
      const submitSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        '#submit_app',
        '#submit-application',
        'button.submit-button',
        '[data-qa="btn-submit"]',
        'button',
        'a[role="button"]'
      ];

      for (const sel of submitSelectors) {
        const matches = Array.from(document.querySelectorAll(sel));
        for (const el of matches) {
          const text = (el.value || el.innerText || '').trim();
          if (/^(submit|submit\s+application|apply\s+now|send\s+application|complete\s+application)$/i.test(text)) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return {
                id: el.id || '',
                text,
                tagName: el.tagName.toLowerCase(),
                selector: el.id ? `#${el.id}` : (el.getAttribute('data-qa') ? `[data-qa="${el.getAttribute('data-qa')}"]` : sel)
              };
            }
          }
        }
      }
      return null;
    });
  } catch (err) {
    return null;
  }
}

module.exports = {
  scanPageForForm,
  extractJobContext,
  ensureFormVisible,
  scanFrameFields,
  locateSubmitButton
};
