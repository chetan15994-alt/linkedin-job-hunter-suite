const test = require('node:test');
const assert = require('node:assert/strict');

const { parsePeriod, parseAge, parseSelection } = require('../src/index');
const { SEARCH_QUERIES } = require('../src/queries');
const {
  extractEmails,
  isHiringPost,
  detectRole,
  matchResume,
  analyzePosts,
  RESUME_VARIANTS
} = require('../src/matcher');

// ==================== Saved Posts Parsers ====================

test('period parser', () => {
  assert.equal(parsePeriod('14 days').days, 14);
  assert.equal(parsePeriod('6w').days, 42);
  assert.equal(parsePeriod('3 months').slug, '3mo');
  assert.equal(parsePeriod('1 year').days, 365.25);
  assert.equal(parsePeriod('bad'), null);
});

test('age parser', () => {
  assert.equal(parseAge('6d'), 6);
  assert.equal(parseAge('3w'), 21);
  assert.equal(parseAge('2mo'), 60.875);
  assert.equal(parseAge('1yr'), 365.25);
});

test('recent selection', () => {
  const s = parseSelection(['3', 'months']);
  assert.equal(s.mode, 'recent');
  assert.equal(s.minDays, 0);
  assert.equal(s.maxDays, 91.3125);
});

test('range normalizes boundaries', () => {
  const s = parseSelection(['6 months', 'to', '3 months']);
  assert.equal(s.mode, 'range');
  assert.equal(s.minDays, 91.3125);
  assert.equal(s.maxDays, 182.625);
  assert.equal(s.slug, '3mo-to-6mo');

  const s2 = parseSelection(['3 months', '6 months']);
  assert.equal(s2.mode, 'range');
  assert.equal(s2.minDays, 91.3125);
  assert.equal(s2.maxDays, 182.625);
  assert.equal(s2.slug, '3mo-to-6mo');
});

test('all-time selection', () => {
  const s = parseSelection(['all']);
  assert.equal(s.mode, 'all');
  assert.equal(s.maxDays, Infinity);
});

test('range filtering is inclusive', () => {
  const s = parseSelection(['3 months', 'to', '6 months']);
  const ages = [30, 91.3125, 120, 182.625, 200];
  assert.deepEqual(ages.filter(x => x >= s.minDays && x <= s.maxDays), [91.3125, 120, 182.625]);
});

// ==================== Search Queries ====================

test('10 search queries are defined and complete', () => {
  assert.equal(SEARCH_QUERIES.length, 10);
  SEARCH_QUERIES.forEach((q, idx) => {
    assert.equal(q.id, idx + 1);
    assert.ok(q.title.length > 0);
    assert.ok(q.query.length > 10);
    assert.ok(q.targetResume.length > 0);
  });
});

test('visa-sponsored query is present in queries', () => {
  const visaQuery = SEARCH_QUERIES.find(q => q.category.includes('Visa'));
  assert.ok(visaQuery);
  assert.ok(visaQuery.query.includes('visa sponsorship'));
});

// ==================== Email Extractor & Hiring Detection ====================

test('extractEmails detects valid emails and filters image extensions', () => {
  const sample = "Reach out to careers@startup.ai or info@company.com! Ignore test@image.png and avatar@photo.jpg";
  const emails = extractEmails(sample);
  assert.deepEqual(emails, ['careers@startup.ai', 'info@company.com']);
});

test('isHiringPost detects hiring intent', () => {
  assert.equal(isHiringPost("We're hiring a Senior PM for our core team!"), true);
  assert.equal(isHiringPost("Looking for great product leaders. Share your resume."), true);
  assert.equal(isHiringPost("Just had coffee with friends today."), false);
});

test('detectRole accurately classifies roles', () => {
  assert.equal(detectRole("We need an AI Product Manager for agentic workflows"), "AI Product Manager");
  assert.equal(detectRole("Looking for a Founding Product Manager 0 to 1"), "Founding Product Manager");
  assert.equal(detectRole("Hiring Senior Product Manager - Growth"), "Senior Product Manager - Growth");
  assert.equal(detectRole("Seeking a Technical Product Manager with API experience"), "Technical Product Manager");
  assert.equal(detectRole("Hiring Product Manager for SaaS"), "Product Manager");
});

// ==================== 6-Resume Intelligent Matching ====================

test('matchResume accurately identifies Agentic AI role', () => {
  const text = "Hiring AI Product Manager to build agentic workflows, LLM evaluation, and prompt engineering guardrails.";
  const match = matchResume(text);
  assert.equal(match.resumeFile, 'Chetan_CV_Agentic_PM_V4.pdf');
});

test('matchResume accurately identifies AdTech role', () => {
  const text = "Looking for Product Manager with programmatic advertising, Prebid, OpenRTB, Google Ad Manager GAM, and SSP yield monetization.";
  const match = matchResume(text);
  assert.equal(match.resumeFile, 'Chetan_CV_AdTech_PM_V4.pdf');
});

test('matchResume accurately identifies Growth PM role', () => {
  const text = "Hiring Senior Product Manager - Growth. Own the user acquisition funnel, A/B testing, experimentation, and cohort conversion.";
  const match = matchResume(text);
  assert.equal(match.resumeFile, 'Chetan_CV_Growth_PM_V4.pdf');
});

test('matchResume accurately identifies Regulated HealthTech role', () => {
  const text = "Technical Product Manager needed for healthcare payer, PBM, and clinical workflow compliance.";
  const match = matchResume(text);
  assert.equal(match.resumeFile, 'Chetan_Resume_-_Regulated_HealthTech_V4.pdf');
});

test('matchResume accurately identifies Technical PM role', () => {
  const text = "Seeking Technical Product Manager (TPM) to lead API developer platforms, data pipeline architecture, and telemetry.";
  const match = matchResume(text);
  assert.equal(match.resumeFile, 'Chetan_CV_Technical_PM_V4.pdf');
});

test('matchResume accurately identifies B2B SaaS role', () => {
  const text = "Hiring PM to scale enterprise B2B SaaS platform, improve customer onboarding activation and reduce account churn.";
  const match = matchResume(text);
  assert.equal(match.resumeFile, 'Chetan_CV_B2BSaaS_PM_V4.pdf');
});

// ==================== Analyze Posts End-to-End ====================

test('analyzePosts extracts hiring details and matches resumes', () => {
  const samplePosts = [
    {
      author: 'Recruiter Jane @ HealthAI',
      text: "We're hiring a Technical PM for healthcare clinical safety and PBM systems. Send resume to jane@healthai.com",
      url: 'https://linkedin.com/posts/123',
      age: '2d'
    },
    {
      author: 'John Founder',
      text: "Weekend thoughts on reading books.",
      url: 'https://linkedin.com/posts/456',
      age: '5d'
    }
  ];

  const results = analyzePosts(samplePosts);
  assert.equal(results.length, 1);
  assert.equal(results[0].role, 'Technical Product Manager');
  assert.deepEqual(results[0].emails, ['jane@healthai.com']);
  assert.equal(results[0].bestResume, 'Chetan_Resume_-_Regulated_HealthTech_V4.pdf');
});

// ==================== Stealth & Stability Tests ====================

const stealth = require('../src/stealth');

test('stealth launch args include anti-detection and crash-prevention flags', () => {
  const args = stealth.getStealthLaunchArgs();
  assert.ok(args.includes('--disable-blink-features=AutomationControlled'));
  assert.ok(args.includes('--hide-crash-restore-bubble'));
  assert.ok(args.includes('--disable-session-crashed-bubble'));
});

test('sanitizeChromeProfile handles missing or existing preferences cleanly', () => {
  const res = stealth.sanitizeChromeProfile('/tmp/non-existent-profile-' + Date.now());
  assert.equal(res, true);
});

// ==================== International & Global PM Tests ====================

const {
  TARGET_COUNTRIES,
  GLOBAL_PM_QUERIES,
  buildCountryQueries,
  detectCountry,
  detectWorkArrangement
} = require('../src/international');

test('all 15 target countries are properly defined with keywords and regions', () => {
  assert.equal(TARGET_COUNTRIES.length, 15);
  const expectedCodes = ['US', 'UK', 'CA', 'DE', 'SG', 'FR', 'ES', 'PL', 'AU', 'NL', 'IE', 'AE', 'CH', 'SE', 'SA'];
  expectedCodes.forEach(code => {
    const found = TARGET_COUNTRIES.find(c => c.id === code);
    assert.ok(found, `Missing target country: ${code}`);
    assert.ok(found.keywords.length >= 2, `Country ${code} lacks search keywords`);
    assert.ok(found.region.length > 0, `Country ${code} lacks region`);
  });
});

test('global PM search queries cover all 12 regional clusters with visa and remote focus', () => {
  assert.equal(GLOBAL_PM_QUERIES.length, 12);
  GLOBAL_PM_QUERIES.forEach(q => {
    assert.ok(q.id >= 1 && q.id <= 12);
    assert.ok(q.title.length > 5);
    assert.ok(q.query.includes('hiring "Product Manager"'));
    assert.ok(q.query.includes('email'));
    assert.ok(q.targetResume.startsWith('Chetan_'));
  });

  const visaQueries = GLOBAL_PM_QUERIES.filter(q => q.focus.includes('Visa'));
  const remoteQueries = GLOBAL_PM_QUERIES.filter(q => q.focus.includes('Remote'));
  assert.ok(visaQueries.length >= 5, 'Must have at least 5 visa queries');
  assert.ok(remoteQueries.length >= 5, 'Must have at least 5 remote queries');
});

test('buildCountryQueries generates 3 targeted queries for single country drill-down', () => {
  const deQueries = buildCountryQueries('DE');
  assert.ok(deQueries);
  assert.equal(deQueries.length, 3);
  assert.ok(deQueries[0].query.includes('Germany'));
  assert.ok(deQueries[0].query.includes('visa'));
  assert.ok(deQueries[1].query.includes('remote'));

  const dubaiQueries = buildCountryQueries('dubai');
  assert.ok(dubaiQueries);
  assert.equal(dubaiQueries.length, 3);
  assert.ok(dubaiQueries[0].query.includes('UAE') || dubaiQueries[0].query.includes('Dubai'));

  const nonExistent = buildCountryQueries('atlantis');
  assert.equal(nonExistent, null);
});

test('detectCountry accurately identifies countries and hubs from text', () => {
  assert.equal(detectCountry('Join our Berlin office as Senior PM!'), 'Germany');
  assert.equal(detectCountry('Hiring Product Manager in London or Manchester.'), 'United Kingdom');
  assert.equal(detectCountry('Relocate to Dubai, UAE with full visa sponsorship.'), 'UAE (Dubai / Abu Dhabi)');
  assert.equal(detectCountry('Looking for a PM in Singapore or Sydney'), 'Singapore, Australia');
  assert.equal(detectCountry('100% worldwide remote opening for anywhere in the world'), 'Global Remote');
  assert.equal(detectCountry('We are building something cool in stealth mode'), 'International / Unspecified');
});

test('detectWorkArrangement accurately identifies visa, relocation, remote, and hybrid', () => {
  assert.equal(
    detectWorkArrangement('We offer visa sponsorship and relocation support to Berlin.'),
    'Visa Sponsored / Relocation'
  );
  assert.equal(
    detectWorkArrangement('Fully remote role, work from anywhere in the world.'),
    'Remote'
  );
  assert.equal(
    detectWorkArrangement('Visa sponsored remote role with relocation assistance.'),
    'Visa Sponsored / Relocation + Remote'
  );
  assert.equal(
    detectWorkArrangement('Hybrid role in London 2 days in office.'),
    'Hybrid'
  );
  assert.equal(
    detectWorkArrangement('On-site position at our headquarters.'),
    'On-site / Flexible'
  );
});

test('analyzePosts enriches posts with country and work arrangement', () => {
  const posts = [
    {
      author: 'Tech Recruiter',
      text: 'Hiring Product Manager in Amsterdam, Netherlands! Visa sponsorship provided. Send CV to recruiter@amsterdam.nl',
      age: '1d'
    }
  ];
  const analyzed = analyzePosts(posts);
  assert.equal(analyzed.length, 1);
  assert.equal(analyzed[0].country, 'Netherlands');
  assert.equal(analyzed[0].workArrangement, 'Visa Sponsored / Relocation');
  assert.deepEqual(analyzed[0].emails, ['recruiter@amsterdam.nl']);
});
