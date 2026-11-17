const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

const {
  CANDIDATE_PROFILE,
  selectBestResume,
  generateCoverLetter,
  answerCustomQuestion
} = require('../src/profile');

test('CANDIDATE_PROFILE contains complete, valid personal and contact details', () => {
  const p = CANDIDATE_PROFILE;
  assert.equal(p.personal.firstName, 'Chetan');
  assert.equal(p.personal.lastName, 'Singh');
  assert.equal(p.personal.email, 'chetan.iimk20@gmail.com');
  assert.equal(p.personal.phoneNational, '8102046143');
  assert.equal(p.personal.phoneCountryCode, '+91');
  assert.equal(p.personal.location.city, 'Bengaluru');
  assert.equal(p.personal.location.country, 'India');
  assert.ok(p.urls.linkedin.includes('linkedin.com/in/chetan-singh'));
  assert.ok(p.urls.github.includes('github.com'));
});

test('All 6 specialized resume files physically exist on disk', () => {
  const resumes = Object.values(CANDIDATE_PROFILE.resumes);
  assert.equal(resumes.length, 6);
  for (const r of resumes) {
    assert.ok(fs.existsSync(r.path), `Resume file must exist: ${r.path}`);
    const stats = fs.statSync(r.path);
    assert.ok(stats.size > 50000, `Resume file must be a valid PDF (>50KB): ${r.filename}`);
  }
});

test('selectBestResume accurately matches Agentic AI role', () => {
  const match = selectBestResume(
    'Looking for a Founding PM to design LLM evaluation benchmarks, multi-step agentic execution traces, and prompt guardrails.',
    'Founding Product Manager - Agentic AI'
  );
  assert.equal(match.key, 'agentic');
  assert.equal(match.filename, 'Chetan_CV_Agentic_PM_V4.pdf');
  assert.ok(match.score > 0);
});

test('selectBestResume accurately matches B2B SaaS role', () => {
  const match = selectBestResume(
    'Seeking an experienced Product Manager to scale our B2B SaaS enterprise workflow platform, improve user activation, and drive customer retention.',
    'Senior Product Manager - B2B SaaS'
  );
  assert.equal(match.key, 'b2bSaaS');
  assert.equal(match.filename, 'Chetan_CV_B2BSaaS_PM_V4.pdf');
});

test('selectBestResume accurately matches Growth PM role', () => {
  const match = selectBestResume(
    'Join our product growth team to run A/B experimentation, optimize onboarding conversion funnels, and lead product-led growth (PLG).',
    'Growth Product Manager'
  );
  assert.equal(match.key, 'growth');
  assert.equal(match.filename, 'Chetan_CV_Growth_PM_V4.pdf');
});

test('selectBestResume accurately matches Technical PM role', () => {
  const match = selectBestResume(
    'We need a Technical PM to lead our core developer API integrations, REST endpoints, data architecture, and system telemetry.',
    'Technical Product Manager'
  );
  assert.equal(match.key, 'technical');
  assert.equal(match.filename, 'Chetan_CV_Technical_PM_V4.pdf');
});

test('selectBestResume accurately matches Regulated HealthTech role', () => {
  const match = selectBestResume(
    'Hiring a HealthTech PM to manage clinical safety guardrails, medical payer compliance, and HIPAA regulatory documentation.',
    'Product Manager - Healthcare & Life Sciences'
  );
  assert.equal(match.key, 'healthTech');
  assert.equal(match.filename, 'Chetan_Resume_-_Regulated_HealthTech_V4.pdf');
});

test('selectBestResume accurately matches AdTech role', () => {
  const match = selectBestResume(
    'Seeking a PM with deep knowledge of programmatic advertising, OpenRTB protocols, supply-side platforms (SSP), Prebid, and Google Ad Manager.',
    'Product Manager - Programmatic Advertising'
  );
  assert.equal(match.key, 'adTech');
  assert.equal(match.filename, 'Chetan_CV_AdTech_PM_V4.pdf');
});

test('generateCoverLetter tailors letter, mentions key metrics, and signs off as Chetan', () => {
  const letter = generateCoverLetter({
    roleTitle: 'AI Product Manager',
    companyName: 'Anthropic',
    jobDescription: 'Seeking an AI PM to build agentic evaluation systems and LLM safety benchmarks.'
  });

  assert.ok(letter.includes('Anthropic'));
  assert.ok(letter.includes('AI Product Manager'));
  assert.ok(letter.includes('EvalAgent'));
  assert.ok(letter.includes('COCKPIT'));
  assert.ok(letter.includes('IIM Kashipur'));
  assert.ok(letter.includes('Sincerely,\nChetan'));
  assert.ok(!letter.includes('Sincerely,\nChetan Singh')); // user strictly requested Chetan only
});

test('answerCustomQuestion provides intelligent answers to common ATS questions', () => {
  // Why join
  const why = answerCustomQuestion('Why do you want to work at Datadog?', { companyName: 'Datadog' });
  assert.ok(why.includes('Datadog'));
  assert.ok(why.includes('0-to-1'));

  // Tough problem
  const tough = answerCustomQuestion('Describe a difficult product challenge you solved.');
  assert.ok(tough.includes('highR'));
  assert.ok(tough.includes('25% to 55%'));

  // AI experience
  const ai = answerCustomQuestion('What is your experience with LLMs and AI Agents?');
  assert.ok(ai.includes('Indegene'));
  assert.ok(ai.includes('EvalAgent'));

  // Notice period
  const notice = answerCustomQuestion('What is your current notice period?');
  assert.ok(notice.includes('30 days'));

  // Salary
  const salary = answerCustomQuestion('What are your salary expectations?');
  assert.ok(salary.includes('Competitive'));
});
