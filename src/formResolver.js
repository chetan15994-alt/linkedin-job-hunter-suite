const { CANDIDATE_PROFILE, selectBestResume, generateCoverLetter, answerCustomQuestion } = require('./profile');

/**
 * Semantic Form Field Classifier and Value Resolver
 * Maps scanned web form fields to candidate profile values, handles ATS variations,
 * selects relevant options for dropdowns/radios, and identifies any gaps or ambiguities.
 */

// Classification Categories
const FIELD_TYPES = {
  FIRST_NAME: 'FIRST_NAME',
  LAST_NAME: 'LAST_NAME',
  FULL_NAME: 'FULL_NAME',
  PREFERRED_NAME: 'PREFERRED_NAME',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  PHONE_COUNTRY_CODE: 'PHONE_COUNTRY_CODE',
  LOCATION_CITY: 'LOCATION_CITY',
  LOCATION_STATE: 'LOCATION_STATE',
  LOCATION_COUNTRY: 'LOCATION_COUNTRY',
  LOCATION_POSTAL: 'LOCATION_POSTAL',
  LOCATION_FULL: 'LOCATION_FULL',
  LINKEDIN_URL: 'LINKEDIN_URL',
  GITHUB_URL: 'GITHUB_URL',
  PORTFOLIO_URL: 'PORTFOLIO_URL',
  WEBSITE_URL: 'WEBSITE_URL',
  RESUME_UPLOAD: 'RESUME_UPLOAD',
  COVER_LETTER_UPLOAD: 'COVER_LETTER_UPLOAD',
  COVER_LETTER_TEXT: 'COVER_LETTER_TEXT',
  CURRENT_COMPANY: 'CURRENT_COMPANY',
  CURRENT_TITLE: 'CURRENT_TITLE',
  YEARS_EXPERIENCE: 'YEARS_EXPERIENCE',
  MONTHS_EXPERIENCE: 'MONTHS_EXPERIENCE',
  EDUCATION_SCHOOL: 'EDUCATION_SCHOOL',
  EDUCATION_DEGREE: 'EDUCATION_DEGREE',
  EDUCATION_MAJOR: 'EDUCATION_MAJOR',
  EDUCATION_YEAR: 'EDUCATION_YEAR',
  WORK_AUTHORIZATION: 'WORK_AUTHORIZATION',
  VISA_SPONSORSHIP: 'VISA_SPONSORSHIP',
  RELOCATION: 'RELOCATION',
  REMOTE_WORK: 'REMOTE_WORK',
  NOTICE_PERIOD: 'NOTICE_PERIOD',
  START_DATE: 'START_DATE',
  CURRENT_CTC: 'CURRENT_CTC',
  EXPECTED_CTC: 'EXPECTED_CTC',
  SALARY_EXPECTATION: 'SALARY_EXPECTATION',
  EEO_GENDER: 'EEO_GENDER',
  EEO_VETERAN: 'EEO_VETERAN',
  EEO_DISABILITY: 'EEO_DISABILITY',
  EEO_RACE: 'EEO_RACE',
  AGREEMENT_CHECKBOX: 'AGREEMENT_CHECKBOX',
  CUSTOM_QUESTION: 'CUSTOM_QUESTION',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Classify a form field into a semantic category.
 * @param {Object} field - Scanned field metadata from formScanner.
 * @returns {string} One of FIELD_TYPES
 */
function classifyField(field) {
  const label = (field.label || '').toLowerCase();
  const name = (field.name || '').toLowerCase();
  const id = (field.id || '').toLowerCase();
  const placeholder = (field.placeholder || '').toLowerCase();
  const autocomplete = (field.autocomplete || '').toLowerCase();
  const type = (field.type || '').toLowerCase();

  const combined = `${label} ${name} ${id} ${placeholder} ${autocomplete}`;

  // 1. File Uploads
  if (type === 'file') {
    if (/cover\s*letter/i.test(combined)) return FIELD_TYPES.COVER_LETTER_UPLOAD;
    return FIELD_TYPES.RESUME_UPLOAD; // Default file input in ATS is resume/cv
  }

  // 2. Checkboxes for terms / consent
  if (type === 'checkbox') {
    if (/agree|terms|privacy|consent|certif|acknowledge|gdpr|statement/i.test(combined)) {
      return FIELD_TYPES.AGREEMENT_CHECKBOX;
    }
  }

  // 3. Autocomplete tokens
  if (autocomplete === 'given-name' || autocomplete === 'fname') return FIELD_TYPES.FIRST_NAME;
  if (autocomplete === 'family-name' || autocomplete === 'lname') return FIELD_TYPES.LAST_NAME;
  if (autocomplete === 'name') return FIELD_TYPES.FULL_NAME;
  if (autocomplete === 'email') return FIELD_TYPES.EMAIL;
  if (autocomplete === 'tel') return FIELD_TYPES.PHONE;

  // 4. Name fields
  if (/\b(first\s*name|given\s*name|fname|first)\b/i.test(combined) && !/last|full|company/i.test(combined)) {
    return FIELD_TYPES.FIRST_NAME;
  }
  if (/\b(last\s*name|family\s*name|surname|lname|last)\b/i.test(combined) && !/first|full|company/i.test(combined)) {
    return FIELD_TYPES.LAST_NAME;
  }
  if (/\b(preferred\s*name|nickname)\b/i.test(combined)) {
    return FIELD_TYPES.PREFERRED_NAME;
  }
  if (/\b(full\s*name|your\s*name|candidate\s*name|applicant\s*name)\b/i.test(combined) ||
      (name === 'name' || id === 'name')) {
    return FIELD_TYPES.FULL_NAME;
  }

  // 5. Contact fields
  if (type === 'email' || /\b(e[-_]?mail(\s*address)?)\b/i.test(combined)) {
    return FIELD_TYPES.EMAIL;
  }
  if (/\b(phone\s*code|country\s*code|dial\s*code)\b/i.test(combined)) {
    return FIELD_TYPES.PHONE_COUNTRY_CODE;
  }
  if (type === 'tel' || /\b(phone|mobile|cell|telephone|contact\s*number)\b/i.test(combined)) {
    return FIELD_TYPES.PHONE;
  }

  // 6. Social and Profile URLs
  if (/linkedin/i.test(combined)) return FIELD_TYPES.LINKEDIN_URL;
  if (/github/i.test(combined)) return FIELD_TYPES.GITHUB_URL;
  if (/portfolio/i.test(combined)) return FIELD_TYPES.PORTFOLIO_URL;
  if (/website|personal\s*url|other\s*website|blog/i.test(combined)) return FIELD_TYPES.WEBSITE_URL;

  // 7. Location fields
  if (/\b(city|town)\b/i.test(combined) && !/ethnicity/i.test(combined)) return FIELD_TYPES.LOCATION_CITY;
  if (/\b(state|province|region)\b/i.test(combined)) return FIELD_TYPES.LOCATION_STATE;
  if (/\b(postal\s*code|zip(\s*code)?|pincode)\b/i.test(combined)) return FIELD_TYPES.LOCATION_POSTAL;
  if (/\b(country)\b/i.test(combined) && !/code/i.test(combined)) return FIELD_TYPES.LOCATION_COUNTRY;
  if (/\b(location|address|residence|current\s*location)\b/i.test(combined)) return FIELD_TYPES.LOCATION_FULL;

  // 8. Current Employment & Experience
  if (/current\s*(company|employer)|most\s*recent\s*(company|employer)/i.test(combined)) return FIELD_TYPES.CURRENT_COMPANY;
  if (/current\s*(title|role|position)|most\s*recent\s*(title|role)/i.test(combined)) return FIELD_TYPES.CURRENT_TITLE;
  if (/months\s*of\s*(\w+\s*)?exp/i.test(combined)) return FIELD_TYPES.MONTHS_EXPERIENCE;
  if (/(years\s*of\s*(\w+\s*)?exp|total\s*(\w+\s*)?exp|years\s*in\s*pm)/i.test(combined)) return FIELD_TYPES.YEARS_EXPERIENCE;

  // 9. Education
  if (/school|university|college|institution|alma\s*mater/i.test(combined)) return FIELD_TYPES.EDUCATION_SCHOOL;
  if (/degree|level\s*of\s*education/i.test(combined)) return FIELD_TYPES.EDUCATION_DEGREE;
  if (/discipline|major|field\s*of\s*study/i.test(combined)) return FIELD_TYPES.EDUCATION_MAJOR;
  if (/(graduation|completion)\s*(year|date)/i.test(combined)) return FIELD_TYPES.EDUCATION_YEAR;

  // 10. Work Authorization & Sponsorship
  if (/sponsorship|require.*sponsorship|visa.*sponsorship|need.*sponsorship|future.*sponsorship/i.test(combined)) {
    return FIELD_TYPES.VISA_SPONSORSHIP;
  }
  if (/(authorized|eligible)\s*to\s*work|work\s*authorization|legal.*right\s*to\s*work/i.test(combined)) {
    return FIELD_TYPES.WORK_AUTHORIZATION;
  }
  if (/relocat(e|ion)/i.test(combined)) return FIELD_TYPES.RELOCATION;
  if (/remote/i.test(combined) && /work|environment|willing/i.test(combined)) return FIELD_TYPES.REMOTE_WORK;

  // 11. Logistics: Notice Period & Salary / CTC
  if (/notice\s*period|availability|how\s*soon/i.test(combined)) return FIELD_TYPES.NOTICE_PERIOD;
  if (/start\s*date|available\s*date|earliest\s*start/i.test(combined)) return FIELD_TYPES.START_DATE;
  if (/current\s*(ctc|salary|compensation|annual|fixed|variable|package)|current.*inr/i.test(combined)) {
    return FIELD_TYPES.CURRENT_CTC;
  }
  if (/expect(ed)?\s*(ctc|salary|compensation|package)|desired\s*(ctc|salary)|pay\s*expectation|salary.*inr/i.test(combined)) {
    return FIELD_TYPES.EXPECTED_CTC;
  }
  if (/salary|compensation|ctc|remuneration|pay\s*expectation/i.test(combined)) return FIELD_TYPES.SALARY_EXPECTATION;

  // 12. Cover Letter
  if (/cover\s*letter|note\s*to\s*(hiring\s*manager|recruiter)|additional\s*info/i.test(combined)) {
    return field.tagName === 'textarea' ? FIELD_TYPES.COVER_LETTER_TEXT : FIELD_TYPES.COVER_LETTER_UPLOAD;
  }

  // 13. Voluntary EEO
  if (/\b(gender|sex)\b/i.test(combined)) return FIELD_TYPES.EEO_GENDER;
  if (/veteran/i.test(combined)) return FIELD_TYPES.EEO_VETERAN;
  if (/disabilit(y|ies)/i.test(combined)) return FIELD_TYPES.EEO_DISABILITY;
  if (/race|ethnicity|demographic/i.test(combined)) return FIELD_TYPES.EEO_RACE;

  // 14. Custom Open-ended Questions (typically textareas or text inputs with longer questions)
  if (field.tagName === 'textarea' || label.length > 25 || /\?$/.test(label)) {
    return FIELD_TYPES.CUSTOM_QUESTION;
  }

  return FIELD_TYPES.UNKNOWN;
}

/**
 * Resolve the exact value or action for a classified field.
 * @param {Object} field - Scanned field
 * @param {string} classification - One of FIELD_TYPES
 * @param {Object} jobContext - Job title, company, description
 * @returns {Object} { value, filePath, selectedOption, action: 'type'|'upload'|'select'|'check'|'skip', rationale }
 */
function resolveFieldValue(field, classification, jobContext = {}) {
  const p = CANDIDATE_PROFILE;
  const targetResume = selectBestResume(jobContext.jobDescription || '', jobContext.jobTitle || '');

  switch (classification) {
    case FIELD_TYPES.FIRST_NAME:
      return { action: 'type', value: p.personal.firstName, rationale: 'Candidate first name' };

    case FIELD_TYPES.LAST_NAME:
      return { action: 'type', value: p.personal.lastName, rationale: 'Candidate last name' };

    case FIELD_TYPES.FULL_NAME:
      return { action: 'type', value: p.personal.fullName, rationale: 'Candidate full legal name' };

    case FIELD_TYPES.PREFERRED_NAME:
      return { action: 'type', value: p.personal.preferredName, rationale: 'Candidate preferred name' };

    case FIELD_TYPES.EMAIL:
      return { action: 'type', value: p.personal.email, rationale: 'Primary verified email' };

    case FIELD_TYPES.PHONE_COUNTRY_CODE:
      if (field.options && field.options.length) {
        const match = findBestOption(field.options, ['+91', 'india', '91']);
        return { action: 'select', selectedOption: match, rationale: 'India dialing code (+91)' };
      }
      return { action: 'type', value: '+91', rationale: 'India country code' };

    case FIELD_TYPES.PHONE:
      if (field.type === 'select') {
        return { action: 'skip', rationale: 'Select dropdown on phone field' };
      }
      // If form expects pure digits without plus
      if (/digits|numeric/i.test(field.placeholder) || field.type === 'number') {
        return { action: 'type', value: p.personal.phoneNational, rationale: 'National digits only' };
      }
      return { action: 'type', value: p.personal.phone, rationale: 'Standard E.164 phone' };

    case FIELD_TYPES.LOCATION_CITY:
      return { action: 'type', value: p.personal.location.city, rationale: 'Current city' };

    case FIELD_TYPES.LOCATION_STATE:
      return { action: 'type', value: p.personal.location.state, rationale: 'Current state' };

    case FIELD_TYPES.LOCATION_POSTAL:
      return { action: 'type', value: p.personal.location.postalCode, rationale: 'Postal pincode' };

    case FIELD_TYPES.LOCATION_COUNTRY:
      if (field.options && field.options.length) {
        const match = findBestOption(field.options, ['india', 'in', 'ind']);
        return { action: 'select', selectedOption: match, rationale: 'Country dropdown: India' };
      }
      return { action: 'type', value: p.personal.location.country, rationale: 'Current country' };

    case FIELD_TYPES.LOCATION_FULL:
      return { action: 'type', value: p.personal.location.formatted, rationale: 'Full formatted address' };

    case FIELD_TYPES.LINKEDIN_URL:
      return { action: 'type', value: p.urls.linkedin, rationale: 'LinkedIn profile URL' };

    case FIELD_TYPES.GITHUB_URL:
      return { action: 'type', value: p.urls.github, rationale: 'GitHub profile URL' };

    case FIELD_TYPES.PORTFOLIO_URL:
    case FIELD_TYPES.WEBSITE_URL:
      return { action: 'type', value: p.urls.portfolio, rationale: 'Product portfolio / profile' };

    case FIELD_TYPES.RESUME_UPLOAD:
      return {
        action: 'upload',
        filePath: targetResume.path,
        filename: targetResume.filename,
        rationale: `Selected best-fit resume: ${targetResume.filename} (${targetResume.category})`
      };

    case FIELD_TYPES.COVER_LETTER_UPLOAD:
      // ATS that asks for a file upload for cover letter
      return {
        action: 'upload',
        filePath: targetResume.path, // attach relevant CV as document
        rationale: 'Attach matched resume document'
      };

    case FIELD_TYPES.COVER_LETTER_TEXT:
      return {
        action: 'type',
        value: generateCoverLetter(jobContext),
        rationale: 'Generated personalized 180-word PM cover letter'
      };

    case FIELD_TYPES.CURRENT_COMPANY:
      return { action: 'type', value: p.currentPosition.company, rationale: 'Current employer' };

    case FIELD_TYPES.CURRENT_TITLE:
      return { action: 'type', value: p.currentPosition.title, rationale: 'Current PM role' };

    case FIELD_TYPES.YEARS_EXPERIENCE:
      if (field.options && field.options.length) {
        const match = findBestOption(field.options, ['6 years', '6', '5-7', '5+', '6+', '5 to 7', '5']);
        return { action: 'select', selectedOption: match, rationale: '6+ years PM experience option' };
      }
      return { action: 'type', value: '6', rationale: '6+ years PM experience' };

    case FIELD_TYPES.MONTHS_EXPERIENCE:
      if (field.options && field.options.length) {
        const match = findBestOption(field.options, ['6 months', '6', '0 month', '0']);
        return { action: 'select', selectedOption: match, rationale: '6 months additional experience option' };
      }
      return { action: 'type', value: '6', rationale: '6 months additional experience' };

    case FIELD_TYPES.EDUCATION_SCHOOL:
      if (field.options && field.options.length) {
        const match = findBestOption(field.options, ['iim', 'kashipur', 'other', 'indian institute of management']);
        return { action: 'select', selectedOption: match, rationale: 'IIM Kashipur / Tier 1' };
      }
      return { action: 'type', value: p.education[0].institution, rationale: 'Highest degree institution' };

    case FIELD_TYPES.EDUCATION_DEGREE:
      if (field.options && field.options.length) {
        const match = findBestOption(field.options, ['master', 'mba', 'postgraduate', 'graduate']);
        return { action: 'select', selectedOption: match, rationale: 'MBA / Master degree' };
      }
      return { action: 'type', value: p.education[0].degree, rationale: 'MBA degree' };

    case FIELD_TYPES.EDUCATION_MAJOR:
      return { action: 'type', value: p.education[0].fieldOfStudy, rationale: 'MBA specialization' };

    case FIELD_TYPES.EDUCATION_YEAR:
      return { action: 'type', value: p.education[0].graduationYear, rationale: 'Graduation year' };

    case FIELD_TYPES.VISA_SPONSORSHIP:
      if (field.type === 'select' || field.type === 'radio_group') {
        const match = findBestOption(field.options, ['yes', 'require sponsorship', 'will require']);
        return { action: field.type === 'select' ? 'select' : 'radio', selectedOption: match, rationale: 'Requires visa sponsorship for international relocation' };
      }
      return { action: 'type', value: 'Yes', rationale: 'Visa sponsorship required' };

    case FIELD_TYPES.WORK_AUTHORIZATION:
      // "Are you authorized to work in India?" -> Yes
      // "Are you legally authorized to work in the United States/UK?"
      const isIndiaAuth = /india/i.test(field.label || '');
      const defaultAuth = isIndiaAuth ? 'yes' : 'no'; // truthful answer on local work authorization
      if (field.type === 'select' || field.type === 'radio_group') {
        const match = findBestOption(field.options, [defaultAuth, 'authorized', 'yes', 'eligible']);
        return { action: field.type === 'select' ? 'select' : 'radio', selectedOption: match, rationale: `Work authorization answer: ${defaultAuth}` };
      }
      return { action: 'type', value: isIndiaAuth ? 'Yes' : 'No (require visa sponsorship)', rationale: 'Work authorization' };

    case FIELD_TYPES.RELOCATION:
      if (field.type === 'select' || field.type === 'radio_group') {
        const match = findBestOption(field.options, ['yes', 'open to relocation', 'willing', 'bangalore']);
        return { action: field.type === 'select' ? 'select' : 'radio', selectedOption: match, rationale: 'Open to relocation' };
      }
      return { action: 'type', value: 'Yes, fully open to relocate anywhere (Bangalore preferred)', rationale: 'Relocation flexibility' };

    case FIELD_TYPES.REMOTE_WORK:
      if (field.type === 'select' || field.type === 'radio_group') {
        const match = findBestOption(field.options, ['yes', 'remote', 'open']);
        return { action: field.type === 'select' ? 'select' : 'radio', selectedOption: match, rationale: 'Open to remote work' };
      }
      return { action: 'type', value: 'Yes', rationale: 'Open to remote work' };

    case FIELD_TYPES.NOTICE_PERIOD:
      if (field.type === 'select' || field.type === 'radio_group') {
        const match = findBestOption(field.options, ['30 days', '1 month', '30', 'immediate', 'less than 1 month', '15-30 days']);
        return { action: field.type === 'select' ? 'select' : 'radio', selectedOption: match, rationale: '30 days notice period' };
      }
      if (/\bin\s*days\b|numeric|digits|number/i.test(`${field.label} ${field.placeholder}`) || field.type === 'number') {
        return { action: 'type', value: '30', rationale: 'Numeric notice period in days (30)' };
      }
      return { action: 'type', value: '30 days', rationale: 'Notice period: 30 days' };

    case FIELD_TYPES.CURRENT_CTC:
      if (/fixed/i.test(`${field.label} ${field.name}`)) {
        const val = /\b(inr|numeric|digits|number|annual)\b/i.test(`${field.label} ${field.placeholder}`) || field.type === 'number' ? '2700000' : '27 LPA';
        return { action: 'type', value: val, rationale: 'Current fixed compensation' };
      }
      if (/variable|bonus/i.test(`${field.label} ${field.name}`)) {
        const val = /\b(inr|numeric|digits|number|annual)\b/i.test(`${field.label} ${field.placeholder}`) || field.type === 'number' ? '200000' : '2 LPA';
        return { action: 'type', value: val, rationale: 'Current variable compensation' };
      }
      if (/\b(inr|numeric|digits|number|annual)\b/i.test(`${field.label} ${field.placeholder}`) || field.type === 'number') {
        return { action: 'type', value: '2900000', rationale: 'Current annual compensation in INR (29 LPA)' };
      }
      return { action: 'type', value: '29 LPA (27L Fixed + 2L Variable)', rationale: 'Current CTC breakdown' };

    case FIELD_TYPES.EXPECTED_CTC:
    case FIELD_TYPES.SALARY_EXPECTATION:
      if (field.type === 'select' || field.type === 'radio_group') {
        const match = findBestOption(field.options, ['35-40', '40', '30-40', 'market rate', 'competitive']);
        return { action: field.type === 'select' ? 'select' : 'radio', selectedOption: match, rationale: 'Expected CTC' };
      }
      if (/\b(inr|numeric|digits|number|annual)\b/i.test(`${field.label} ${field.placeholder}`) || field.type === 'number') {
        return { action: 'type', value: '4000000', rationale: 'Expected annual compensation in INR (40 LPA)' };
      }
      return { action: 'type', value: '40 LPA', rationale: 'Expected CTC: 40 LPA' };

    case FIELD_TYPES.START_DATE:
      return { action: 'type', value: 'Within 30 days', rationale: 'Availability' };

    case FIELD_TYPES.EEO_GENDER:
      if (field.options && field.options.length) {
        const match = findBestOption(field.options, ['male', 'man', 'decline', 'prefer not to say', 'choose not to']);
        return { action: field.type === 'select' ? 'select' : 'radio', selectedOption: match, rationale: 'Gender self-identification' };
      }
      return { action: 'skip', rationale: 'EEO gender non-select' };

    case FIELD_TYPES.EEO_VETERAN:
      if (field.options && field.options.length) {
        const match = findBestOption(field.options, ['not a protected veteran', 'not a veteran', 'no', 'decline', 'prefer not']);
        return { action: field.type === 'select' ? 'select' : 'radio', selectedOption: match, rationale: 'Veteran status' };
      }
      return { action: 'skip', rationale: 'EEO veteran' };

    case FIELD_TYPES.EEO_DISABILITY:
      if (field.options && field.options.length) {
        const match = findBestOption(field.options, ['no, i do not have a disability', 'no', 'decline', 'prefer not']);
        return { action: field.type === 'select' ? 'select' : 'radio', selectedOption: match, rationale: 'Disability status' };
      }
      return { action: 'skip', rationale: 'EEO disability' };

    case FIELD_TYPES.EEO_RACE:
      if (field.options && field.options.length) {
        const match = findBestOption(field.options, ['asian', 'decline', 'prefer not to say', 'choose not']);
        return { action: field.type === 'select' ? 'select' : 'radio', selectedOption: match, rationale: 'Race/Ethnicity' };
      }
      return { action: 'skip', rationale: 'EEO race' };

    case FIELD_TYPES.AGREEMENT_CHECKBOX:
      return { action: 'check', value: true, rationale: 'Required applicant consent checkbox' };

    case FIELD_TYPES.CUSTOM_QUESTION:
      const answer = answerCustomQuestion(field.label || field.placeholder || '', jobContext);
      return { action: 'type', value: answer, rationale: 'Intelligently generated custom PM response' };

    default:
      if (field.required) {
        if (field.type === 'radio_group' && field.options && field.options.length) {
          return { action: 'radio', selectedOption: field.options[0], rationale: 'Required radio selection fallback' };
        }
        if (field.type === 'select' && field.options && field.options.length) {
          return { action: 'select', selectedOption: field.options[0], rationale: 'Required dropdown selection fallback' };
        }
        if (field.type === 'checkbox') {
          return { action: 'check', value: true, rationale: 'Required checkbox agreement fallback' };
        }
        // Fallback for required unknown text field
        return { action: 'type', value: 'N/A', rationale: 'Required field fallback' };
      }
      return { action: 'skip', rationale: 'Optional unknown field' };
  }
}

/**
 * Fuzzy search available options in a select or radio group to find the best match.
 */
function findBestOption(options = [], preferredPatterns = []) {
  if (!options || !options.length) return null;

  for (const pat of preferredPatterns) {
    const patLower = pat.toLowerCase();
    
    // Exact match
    const exact = options.find(o => (o.text || '').toLowerCase() === patLower || (o.value || '').toLowerCase() === patLower);
    if (exact && !exact.disabled) return exact;

    // Word boundary or substring match
    const sub = options.find(o => {
      const text = (o.text || '').toLowerCase();
      const val = (o.value || '').toLowerCase();
      return (text.includes(patLower) || val.includes(patLower)) && !o.disabled;
    });
    if (sub) return sub;
  }

  // If nothing matched, pick first non-empty, non-disabled option
  return options.find(o => !o.disabled && (o.text || '').trim().length > 0 && (o.value || '').trim() !== '') || options[0];
}

/**
 * Map all scanned fields into actionable fill plans with validation audits.
 */
function resolveAllFields(scannedFields = [], jobContext = {}) {
  const plan = [];
  const warnings = [];
  const targetResume = selectBestResume(jobContext.jobDescription || '', jobContext.jobTitle || '');

  for (const field of scannedFields) {
    const classification = classifyField(field);
    const resolution = resolveFieldValue(field, classification, jobContext);

    const item = {
      field,
      classification,
      action: resolution.action,
      value: resolution.value || null,
      filePath: resolution.filePath || null,
      selectedOption: resolution.selectedOption || null,
      rationale: resolution.rationale,
      required: field.required
    };

    plan.push(item);

    // Audit for gaps on required fields
    if (field.required && resolution.action === 'skip') {
      warnings.push(`Required field "${field.label || field.name || field.id}" could not be safely mapped.`);
    }
  }

  return {
    plan,
    targetResume,
    warnings,
    isReady: warnings.length === 0
  };
}

module.exports = {
  FIELD_TYPES,
  classifyField,
  resolveFieldValue,
  findBestOption,
  resolveAllFields
};
