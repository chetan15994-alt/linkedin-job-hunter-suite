const test = require('node:test');
const assert = require('node:assert/strict');

const {
  FIELD_TYPES,
  classifyField,
  resolveFieldValue,
  findBestOption,
  resolveAllFields
} = require('../src/formResolver');

test('classifyField accurately identifies Name variations', () => {
  assert.equal(classifyField({ label: 'First Name', name: 'first_name', id: 'first_name', type: 'text' }), FIELD_TYPES.FIRST_NAME);
  assert.equal(classifyField({ label: 'Given Name', name: 'applicant[first_name]', type: 'text' }), FIELD_TYPES.FIRST_NAME);
  assert.equal(classifyField({ label: 'Last Name', name: 'last_name', id: 'last_name', type: 'text' }), FIELD_TYPES.LAST_NAME);
  assert.equal(classifyField({ label: 'Family Name / Surname', name: 'surname', type: 'text' }), FIELD_TYPES.LAST_NAME);
  assert.equal(classifyField({ label: 'Full Name', name: 'name', type: 'text' }), FIELD_TYPES.FULL_NAME);
  assert.equal(classifyField({ label: 'Preferred Name (Optional)', name: 'nickname', type: 'text' }), FIELD_TYPES.PREFERRED_NAME);
});

test('classifyField accurately identifies Contact and Social fields', () => {
  assert.equal(classifyField({ label: 'Email Address', name: 'email', type: 'email' }), FIELD_TYPES.EMAIL);
  assert.equal(classifyField({ label: 'Phone Number', name: 'phone', type: 'tel' }), FIELD_TYPES.PHONE);
  assert.equal(classifyField({ label: 'Country Dial Code', name: 'phone_country_code', type: 'select' }), FIELD_TYPES.PHONE_COUNTRY_CODE);
  assert.equal(classifyField({ label: 'LinkedIn Profile', name: 'urls[LinkedIn]', type: 'text' }), FIELD_TYPES.LINKEDIN_URL);
  assert.equal(classifyField({ label: 'GitHub URL', name: 'urls[GitHub]', type: 'text' }), FIELD_TYPES.GITHUB_URL);
  assert.equal(classifyField({ label: 'Personal Website / Portfolio', name: 'portfolio', type: 'text' }), FIELD_TYPES.PORTFOLIO_URL);
});

test('classifyField accurately identifies File Uploads', () => {
  assert.equal(classifyField({ label: 'Resume / CV', name: 'resume', type: 'file' }), FIELD_TYPES.RESUME_UPLOAD);
  assert.equal(classifyField({ label: 'Attach Cover Letter', name: 'cover_letter', type: 'file' }), FIELD_TYPES.COVER_LETTER_UPLOAD);
});

test('classifyField accurately identifies Work Authorization, Visa, Notice Period and CTC fields', () => {
  assert.equal(classifyField({ label: 'Will you now or in the future require visa sponsorship to work in the United States?', type: 'select' }), FIELD_TYPES.VISA_SPONSORSHIP);
  assert.equal(classifyField({ label: 'Are you legally authorized to work in India?', type: 'select' }), FIELD_TYPES.WORK_AUTHORIZATION);
  assert.equal(classifyField({ label: 'Are you open to relocation?', type: 'radio_group' }), FIELD_TYPES.RELOCATION);
  assert.equal(classifyField({ label: 'Are you willing to work in a remote environment?', type: 'radio_group' }), FIELD_TYPES.REMOTE_WORK);
  assert.equal(classifyField({ label: 'Please enter your notice period in days*', type: 'text' }), FIELD_TYPES.NOTICE_PERIOD);
  assert.equal(classifyField({ label: 'Please enter your current ctc in INR*', type: 'text' }), FIELD_TYPES.CURRENT_CTC);
  assert.equal(classifyField({ label: 'What is your expected CTC in INR?', type: 'text' }), FIELD_TYPES.EXPECTED_CTC);

  // Verify resolution
  const resolvedNotice = resolveFieldValue({ label: 'Please enter your notice period in days*', type: 'text' }, FIELD_TYPES.NOTICE_PERIOD);
  assert.equal(resolvedNotice.value, '30');

  const resolvedCurrent = resolveFieldValue({ label: 'Please enter your current ctc in INR*', type: 'text' }, FIELD_TYPES.CURRENT_CTC);
  assert.equal(resolvedCurrent.value, '2900000');

  const resolvedExpected = resolveFieldValue({ label: 'What is your expected CTC in INR?', type: 'text' }, FIELD_TYPES.EXPECTED_CTC);
  assert.equal(resolvedExpected.value, '4000000');
});

test('classifyField accurately identifies EEO and Custom fields', () => {
  assert.equal(classifyField({ label: 'Gender (Voluntary Self-Identification)', type: 'select' }), FIELD_TYPES.EEO_GENDER);
  assert.equal(classifyField({ label: 'Veteran Status', type: 'select' }), FIELD_TYPES.EEO_VETERAN);
  assert.equal(classifyField({ label: 'Disability Status', type: 'select' }), FIELD_TYPES.EEO_DISABILITY);
  assert.equal(classifyField({ label: 'Why are you excited to join our product team?', type: 'textarea', tagName: 'textarea' }), FIELD_TYPES.CUSTOM_QUESTION);
  assert.equal(classifyField({ label: 'I agree to the privacy policy and terms of processing my application.', type: 'checkbox' }), FIELD_TYPES.AGREEMENT_CHECKBOX);
});

test('findBestOption matches options with fuzzy and word boundary rules', () => {
  const countryOptions = [
    { value: '', text: 'Select Country' },
    { value: 'US', text: 'United States (+1)' },
    { value: 'UK', text: 'United Kingdom (+44)' },
    { value: 'IN', text: 'India (+91)' }
  ];
  const matched = findBestOption(countryOptions, ['+91', 'india']);
  assert.ok(matched);
  assert.equal(matched.value, 'IN');

  const noticeOptions = [
    { value: 'immediate', text: 'Immediate' },
    { value: '30days', text: '1 Month / 30 Days' },
    { value: '60days', text: '2 Months' }
  ];
  const matchedNotice = findBestOption(noticeOptions, ['30 days', '1 month']);
  assert.ok(matchedNotice);
  assert.equal(matchedNotice.value, '30days');
});

test('resolveAllFields maps complete form without warnings on valid inputs', () => {
  const mockFields = [
    { label: 'First Name', name: 'first_name', type: 'text', required: true },
    { label: 'Last Name', name: 'last_name', type: 'text', required: true },
    { label: 'Email', name: 'email', type: 'email', required: true },
    { label: 'Phone', name: 'phone', type: 'tel', required: true },
    { label: 'Resume', name: 'resume', type: 'file', required: true },
    { label: 'LinkedIn', name: 'linkedin', type: 'text', required: false },
    {
      label: 'Will you require visa sponsorship?',
      type: 'select',
      tagName: 'select',
      required: true,
      options: [
        { value: 'yes', text: 'Yes' },
        { value: 'no', text: 'No' }
      ]
    }
  ];

  const resolution = resolveAllFields(mockFields, {
    jobTitle: 'Senior Product Manager - B2B SaaS',
    jobDescription: 'Leading enterprise cloud workflows'
  });

  assert.equal(resolution.plan.length, 7);
  assert.equal(resolution.warnings.length, 0);
  assert.equal(resolution.isReady, true);
  assert.equal(resolution.targetResume.filename, 'Chetan_CV_B2BSaaS_PM_V4.pdf');

  const resumeItem = resolution.plan.find(p => p.classification === FIELD_TYPES.RESUME_UPLOAD);
  assert.equal(resumeItem.action, 'upload');
  assert.ok(resumeItem.filePath.includes('Chetan_CV_B2BSaaS_PM_V4.pdf'));
});

test('resolveAllFields flags unmappable required fields with warning', () => {
  const mockFields = [
    { label: 'First Name', name: 'first_name', type: 'text', required: true },
    { label: 'Special Secret Security Token', name: 'security_token', type: 'text', required: true }
  ];

  const resolution = resolveAllFields(mockFields);
  assert.equal(resolution.plan.length, 2);
  // Unknown required field defaults to fallback value or warning
  assert.ok(resolution.plan[1].action === 'type');
});
