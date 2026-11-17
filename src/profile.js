const path = require('path');
const fs = require('fs');

/**
 * Candidate Master Profile: Chetan
 * Comprehensive repository of profile fields, experience, education,
 * work authorization, and specialized resume mapping for autonomous job application.
 */

const RESUMES_DIR = path.resolve(__dirname, '../resumes_chetan');

const CANDIDATE_PROFILE = {
  personal: {
    fullName: 'Chetan Singh',
    preferredName: 'Chetan',
    firstName: 'Chetan',
    lastName: 'Singh',
    email: 'chetan.iimk20@gmail.com',
    phone: '+918102046143',
    phoneCountryCode: '+91',
    phoneNational: '8102046143',
    phoneFormatted: '+91 81020 46143',
    location: {
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      countryCode: 'IN',
      postalCode: '560100',
      formatted: 'Bengaluru, Karnataka, India'
    }
  },

  urls: {
    linkedin: 'https://www.linkedin.com/in/chetan-singh-6853a9113',
    github: 'https://github.com/chetan15994-alt',
    portfolio: 'https://www.linkedin.com/in/chetan-singh-6853a9113',
    website: 'https://www.linkedin.com/in/chetan-singh-6853a9113',
    twitter: ''
  },

  currentPosition: {
    title: 'Founding Product Manager - AI Platforms & Agentic AI',
    company: 'Indegene',
    location: 'Bengaluru, India',
    startDate: '2023-08-01',
    isCurrent: true,
    totalExperienceYears: 6.5,
    summary: '6+ years in Product Management combining 0-to-1 B2B SaaS platforms, enterprise AI agent orchestration, and national-scale growth platforms. MBA from IIM Kashipur and B.Arch from NIT Patna.'
  },

  experience: [
    {
      company: 'Indegene',
      title: 'Founding Product Manager (AI Platforms & Agentic AI)',
      location: 'Bengaluru, India',
      startDate: '2023-08',
      endDate: 'Present',
      isCurrent: true,
      description: 'Founding PM for enterprise AI agent governance and LLM evaluation portfolio. Built EvalAgent (multi-step trace auditing with 85% human agreement), COCKPIT (self-healing QA agents with 4x test coverage), and NEXT Super App 4-module GenAI content compliance pipeline.'
    },
    {
      company: 'Datawrkz',
      title: 'Product Manager (B2B SaaS & AdTech Platforms)',
      location: 'Bengaluru, India',
      startDate: '2021-06',
      endDate: '2023-07',
      isCurrent: false,
      description: '0-to-1 launch of highR (supply-side platform) to 100+ publishers; onboarded first paying client in <6 months; doubled active client base and tripled revenue by lifting publisher activation from 25% to 55%.'
    },
    {
      company: "BYJU'S",
      title: 'Product Manager (Consumer Platforms & Operations)',
      location: 'Bengaluru, India',
      startDate: '2020-05',
      endDate: '2021-05',
      isCurrent: false,
      description: 'Managed core content operations and predictive ML forecasting platforms across 4 cross-functional squads, serving millions of learners.'
    },
    {
      company: 'DigiHealth',
      title: 'Product Analyst Intern',
      location: 'Bengaluru, India',
      startDate: '2019-04',
      endDate: '2019-06',
      isCurrent: false,
      description: 'Analyzed consumer onboarding funnels and healthcare analytics, achieving a 55% bounce rate reduction.'
    }
  ],

  education: [
    {
      institution: 'Indian Institute of Management Kashipur (IIM Kashipur)',
      degree: 'Master of Business Administration (MBA)',
      fieldOfStudy: 'General Management, Product Strategy & Marketing',
      startDate: '2018',
      endDate: '2020',
      graduationYear: '2020',
      gpa: ''
    },
    {
      institution: 'National Institute of Technology Patna (NIT Patna)',
      degree: 'Bachelor of Architecture (B.Arch)',
      fieldOfStudy: 'Architecture & Planning',
      startDate: '2012',
      endDate: '2017',
      graduationYear: '2017',
      gpa: ''
    }
  ],

  logistics: {
    authorizedInIndia: 'Yes',
    requiresVisaSponsorshipUS: 'Yes',
    requiresVisaSponsorshipGlobal: 'Yes',
    openToRelocation: 'Yes',
    openToRemote: 'Yes',
    noticePeriodDays: 30,
    noticePeriodString: '30 days (negotiable / early release feasible)',
    earliestStartDate: 'Within 30 days',
    expectedSalary: 'Competitive / Market Rate',
    workModelPreference: 'Remote or Hybrid preferred; open to Relocation'
  },

  eeo: {
    gender: 'Male',
    genderOptOut: 'Decline to self-identify',
    veteranStatus: 'I am not a protected veteran',
    veteranOptOut: 'I do not wish to answer',
    disabilityStatus: 'No, I do not have a disability',
    disabilityOptOut: 'I do not wish to answer',
    raceEthnicity: 'Asian',
    raceOptOut: 'Decline to self-identify',
    hispanicLatino: 'No'
  },

  resumes: {
    agentic: {
      filename: 'Chetan_CV_Agentic_PM_V4.pdf',
      path: path.join(RESUMES_DIR, 'Chetan_CV_Agentic_PM_V4.pdf'),
      category: 'Agentic AI / Applied AI',
      keywords: ['agentic', 'agent', 'evalagent', 'cockpit', 'llm', 'genai', 'generative ai', 'prompt', 'rag', 'ai safety', 'founding']
    },
    b2bSaaS: {
      filename: 'Chetan_CV_B2BSaaS_PM_V4.pdf',
      path: path.join(RESUMES_DIR, 'Chetan_CV_B2BSaaS_PM_V4.pdf'),
      category: 'B2B SaaS / Enterprise Platforms',
      keywords: ['b2b', 'saas', 'enterprise', 'highr', 'platform', 'onboarding', 'activation', 'retention', 'churn', '0-to-1']
    },
    growth: {
      filename: 'Chetan_CV_Growth_PM_V4.pdf',
      path: path.join(RESUMES_DIR, 'Chetan_CV_Growth_PM_V4.pdf'),
      category: 'Growth & Monetization',
      keywords: ['growth', 'plg', 'funnel', 'monetization', 'experimentation', 'a/b', 'acquisition', 'conversion', 'retention']
    },
    technical: {
      filename: 'Chetan_CV_Technical_PM_V4.pdf',
      path: path.join(RESUMES_DIR, 'Chetan_CV_Technical_PM_V4.pdf'),
      category: 'Technical PM / APIs',
      keywords: ['technical', 'tpm', 'api', 'apis', 'rest', 'architecture', 'infrastructure', 'developer', 'sql', 'python', 'telemetry']
    },
    healthTech: {
      filename: 'Chetan_Resume_-_Regulated_HealthTech_V4.pdf',
      path: path.join(RESUMES_DIR, 'Chetan_Resume_-_Regulated_HealthTech_V4.pdf'),
      category: 'Regulated HealthTech & Life Sciences',
      keywords: ['health', 'healthtech', 'life sciences', 'clinical', 'medical', 'compliance', 'regulatory', 'hipaa', 'payer', 'pbm']
    },
    adTech: {
      filename: 'Chetan_CV_AdTech_PM_V4.pdf',
      path: path.join(RESUMES_DIR, 'Chetan_CV_AdTech_PM_V4.pdf'),
      category: 'AdTech / Programmatic',
      keywords: ['adtech', 'programmatic', 'ssp', 'dsp', 'openrtb', 'prebid', 'header bidding', 'gam', 'adx', 'monetization', 'publisher']
    }
  }
};

/**
 * Intelligently select the best matching resume based on job title and description text.
 */
function selectBestResume(jobText = '', roleTitle = '') {
  const combined = `${roleTitle} ${jobText}`.toLowerCase();
  let bestKey = 'b2bSaaS';
  let maxScore = -1;

  for (const [key, meta] of Object.entries(CANDIDATE_PROFILE.resumes)) {
    let score = 0;
    for (const kw of meta.keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      const matches = combined.match(regex);
      if (matches) {
        score += matches.length * (kw.length > 5 ? 2 : 1);
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestKey = key;
    }
  }

  // Fallback defaults based on roleTitle clues
  if (maxScore <= 0) {
    if (/ai|agent|llm|genai/i.test(roleTitle)) bestKey = 'agentic';
    else if (/growth|plg/i.test(roleTitle)) bestKey = 'growth';
    else if (/technical|api|platform/i.test(roleTitle)) bestKey = 'technical';
    else if (/health|medical/i.test(roleTitle)) bestKey = 'healthTech';
    else if (/adtech|advertising/i.test(roleTitle)) bestKey = 'adTech';
    else bestKey = 'b2bSaaS';
  }

  const selected = CANDIDATE_PROFILE.resumes[bestKey];
  return {
    key: bestKey,
    filename: selected.filename,
    path: selected.path,
    category: selected.category,
    score: Math.max(maxScore, 1)
  };
}

/**
 * Generate a concise, persuasive, role-tailored cover letter (150-220 words).
 */
function generateCoverLetter(jobContext = {}) {
  const role = jobContext.roleTitle || 'Product Manager';
  const company = jobContext.companyName || 'your team';
  const resumeMatch = selectBestResume(jobContext.jobDescription || '', role);

  let specificPitch = '';
  if (resumeMatch.key === 'agentic') {
    specificPitch = 'As Founding PM for Indegene’s AI platform portfolio, I built EvalAgent (multi-step trace auditing with 85% human agreement) and COCKPIT (self-healing QA agents yielding 4x test coverage). I specialize in turning complex agentic reasoning and LLM workflows into reliable, enterprise-ready products.';
  } else if (resumeMatch.key === 'growth') {
    specificPitch = 'At Datawrkz and BYJU’S, I spearheaded data-driven growth initiatives that lifted active publisher activation from 25% to 55%, improved user retention by 35%, and expanded revenue per account by 50% through rapid experimentation and funnel optimization.';
  } else if (resumeMatch.key === 'technical') {
    specificPitch = 'With deep hands-on expertise across REST APIs, data architecture, and predictive telemetry, I benchmarked open-source AI toolkits across 500+ production traces and architected scalable B2B platforms at one-third of commercial API cost.';
  } else if (resumeMatch.key === 'healthTech') {
    specificPitch = 'Leading AI governance in regulated life sciences at Indegene and prior health analytics at DigiHealth, I established medical accuracy rubrics that reduced clinical review rework by 50% with strict human-in-the-loop guardrails.';
  } else if (resumeMatch.key === 'adTech') {
    specificPitch = 'I launched highR (Supply-Side Platform) from 0-to-1 to 100+ publishers, securing our first paying client in under 6 months and optimizing programmatic yield across Prebid, OpenRTB, and Google Ad Manager.';
  } else {
    specificPitch = 'I bring 6+ years of end-to-end B2B SaaS platform leadership, taking products from 0-to-1 concept to enterprise scale, driving customer activation, and aligning cross-functional engineering squads with business revenue.';
  }

  return `Dear Hiring Team at ${company},

I am writing to express my strong interest in the ${role} position. With 6+ years of product management experience, an MBA from IIM Kashipur, and a B.Arch from NIT Patna, I have consistently delivered high-impact products at the intersection of complex systems, user experience, and measurable business growth.

${specificPitch}

I am energized by ${company}’s mission and would welcome the opportunity to bring my product execution, analytical rigor, and customer focus to your team. Thank you for your time and consideration.

Sincerely,
Chetan
+91 81020 46143
chetan.iimk20@gmail.com
linkedin.com/in/chetan-singh-6853a9113`;
}

/**
 * Intelligently answer custom or open-ended ATS questions based on Chetan's verified record.
 */
function answerCustomQuestion(questionText = '', jobContext = {}) {
  const q = questionText.toLowerCase();

  // Why join / Why company
  if (/why (do you want to|are you interested in|join|work at)|what excites you/i.test(q)) {
    const comp = jobContext.companyName || 'this company';
    return `I am excited by ${comp}’s mission and scale. My background combines 0-to-1 B2B product delivery with enterprise AI and growth experimentation. I want to bring my experience scaling platforms from concept to revenue and solving complex customer pain points directly to ${comp}.`;
  }

  // Proudest achievement / Tough problem
  if (/proudest|achievement|accomplishment|challenge|tough problem|difficult situation/i.test(q)) {
    return `One of my proudest achievements was building highR, a 0-to-1 B2B platform. We signed our first paying client within 6 months, redesigned the activation funnel to lift client onboarding from 25% to 55%, and tripled revenue within one year through rigorous user telemetry and iterative backlog prioritization.`;
  }

  // Experience with AI / GenAI / LLMs
  if (/ai|genai|llm|machine learning|prompt|agent/i.test(q)) {
    return `As Founding PM at Indegene, I lead our AI evaluation and agentic portfolio. I developed EvalAgent for multi-step LLM trace auditing (achieving 85% human agreement) and COCKPIT for autonomous test generation with <3% incorrect repairs. I focus heavily on reliability, evaluation rubrics, and human-in-the-loop guardrails.`;
  }

  // Work authorization / Visa sponsorship
  if (/visa|sponsorship|authorized|legally authorized|require sponsorship/i.test(q)) {
    if (/currently authorized to work in india/i.test(q)) return 'Yes';
    if (/require.*sponsorship|need.*visa/i.test(q)) return 'Yes';
    return 'I am an Indian citizen authorized to work in India, and I am open to remote roles or positions offering visa sponsorship / relocation assistance.';
  }

  // Notice period / Start date
  if (/notice period|how soon|start date|availability/i.test(q)) {
    return '30 days (negotiable / early release feasible)';
  }

  // Salary expectations
  if (/salary|compensation|ctc|remuneration|expectation/i.test(q)) {
    return 'Competitive / Negotiable based on role scope, location, and overall compensation structure.';
  }

  // General fallback
  return `With 6+ years in Product Management, an MBA from IIM Kashipur, and proven success shipping 0-to-1 B2B platforms and AI agent systems, I bring strong strategic vision, data-driven execution, and customer focus to every challenge.`;
}

module.exports = {
  CANDIDATE_PROFILE,
  RESUMES_DIR,
  selectBestResume,
  generateCoverLetter,
  answerCustomQuestion
};
