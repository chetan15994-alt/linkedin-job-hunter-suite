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
    preferredLocation: 'Bangalore',
    locationFlexibility: 'Bangalore preferred; open to relocate anywhere (domestic and international with visa sponsorship)',
    noticePeriodDays: 30,
    noticePeriodDaysNum: '30',
    noticePeriodString: '30 days',
    earliestStartDate: 'Within 30 days',
    currentCTC: '29 LPA (27L Fixed + 2L Variable)',
    currentCTCNumeric: '2900000',
    currentCTCFixed: '27 LPA',
    currentCTCFixedNumeric: '2700000',
    currentCTCVariable: '2 LPA',
    currentCTCVariableNumeric: '200000',
    expectedCTC: '40 LPA',
    expectedCTCNumeric: '4000000',
    expectedSalary: '40 LPA (negotiable based on overall package & equity)',
    workModelPreference: 'Bangalore or Remote; fully open to relocate anywhere'
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
 * Intelligently answer custom or open-ended ATS questions based on Chetan's verified record,
 * applying creative, structured (Problem-Action-Outcome) storytelling to maximize hiring manager impact.
 */
function answerCustomQuestion(questionText = '', jobContext = {}) {
  const q = questionText.toLowerCase();

  // 1. Notice Period & Availability (numeric or text)
  if (/notice\s*period|how\s*soon|days.*notice|availability/i.test(q)) {
    if (/\bin\s*days\b|numeric|number|digits/i.test(q)) {
      return '30';
    }
    return '30 days';
  }

  // 2. Current CTC / Compensation (numeric or text)
  if (/current\s*(ctc|salary|compensation|annual|package)|current.*inr/i.test(q)) {
    if (/fixed/i.test(q)) {
      return /\b(inr|number|numeric|digits)\b/i.test(q) ? '2700000' : '27 LPA';
    }
    if (/variable|bonus/i.test(q)) {
      return /\b(inr|number|numeric|digits)\b/i.test(q) ? '200000' : '2 LPA';
    }
    if (/\b(inr|number|numeric|digits|annual)\b/i.test(q)) {
      return '2900000';
    }
    return '29 LPA (27 LPA Fixed + 2 LPA Variable)';
  }

  // 3. Expected CTC / Remuneration (numeric or text)
  if (/expect(ed)?\s*(ctc|salary|compensation|package)|desired\s*(ctc|salary)|pay\s*expectation|salary.*inr|salary\s*expectation/i.test(q)) {
    if (/\b(inr|number|numeric|digits|annual)\b/i.test(q)) {
      return '4000000';
    }
    return '40 LPA (Competitive / Negotiable based on role scope and overall package)';
  }

  // 4. Location, Relocation, Schedule & Work Mode
  if (/timing|shift|work hours|schedule|onsite.*timing|would you be comfortable/i.test(q)) {
    return 'Yes, I am comfortable with this schedule.';
  }
  if (/location\s*preference|preferred\s*location/i.test(q)) {
    return 'Bangalore is my preferred location, but I am fully open and flexible to relocate anywhere or work remotely.';
  }
  if (/relocat(e|ion)/i.test(q)) {
    if (/willing|open|ready/i.test(q)) return 'Yes';
    return 'Yes, I am fully open to relocating for the right opportunity, including domestic hubs and international locations with visa sponsorship.';
  }
  if (/remote/i.test(q) && /work|environment|comfort|willing/i.test(q)) {
    return 'Yes, I have extensive experience collaborating asynchronously across global, distributed cross-functional teams and am 100% comfortable working remotely.';
  }

  // 5. Work Authorization & International Visa Sponsorship
  if (/visa|sponsorship|authorized|legally authorized|require sponsorship/i.test(q)) {
    if (/currently authorized to work in india/i.test(q)) return 'Yes';
    if (/require.*sponsorship|need.*visa/i.test(q)) return 'Yes';
    return 'I am an Indian citizen legally authorized to work in India, and I am excited and eligible for international roles offering visa sponsorship.';
  }

  // 6. Why Join / Why Company
  if (/why (do you want to|are you interested in|join|work at)|what excites you/i.test(q)) {
    const comp = jobContext.companyName || 'your organization';
    return `I am drawn to ${comp} because of your ambition, market impact, and customer focus. With 6.5+ years leading 0-to-1 B2B platforms, AI agent architectures, and high-velocity growth squads, I thrive on taking ambiguous problems and turning them into scalable, high-retention software. I want to bring that same high-conviction execution, technical depth, and commercial rigor to accelerate ${comp}’s roadmap.`;
  }

  // 7. Proudest Achievement / Tough Product Challenge / High-Impact Projects
  if (/proudest|achievement|accomplishment|success\s*story|challenge|tough problem|difficult situation/i.test(q)) {
    return `At Datawrkz, one of my most defining achievements was building our 0-to-1 B2B platform (highR) from scratch. We faced intense publisher friction during initial rollout; by analyzing user drop-offs and redesigning the activation funnel into a self-serve flow, I lifted publisher onboarding activation from 25% to 55%, cut time-to-first-revenue by 60%, and tripled revenue in under 12 months.`;
  }

  // 8. AI / LLM / GenAI / Agentic Experience
  if (/ai|genai|llm|machine learning|prompt|agent|model/i.test(q)) {
    return `As Founding PM at Indegene, I lead our enterprise AI platforms. I built EvalAgent, a multi-step LLM trace auditing engine achieving 85% human agreement on clinical accuracy, and COCKPIT, an autonomous test-generation system delivering 4x test surface coverage with under 3% false positives. I specialize in designing reliable human-in-the-loop workflows, dynamic guardrails, and cost-optimized multi-model orchestration.`;
  }

  // 9. Challenging Engineering Situation / Conflict Resolution / Failure
  if (/obstacle|conflict|failure|disagreement|difficult coworker/i.test(q)) {
    return `At Indegene, when scaling our real-time LLM evaluation pipeline, our agent trace auditing faced severe latency bottlenecks that jeopardized enterprise SLAs. Rather than debating in silos, I led an engineering spike across our backend and AI squads, analyzed query telemetry across 500+ production traces, and architected an asynchronous tiered caching and batched evaluation framework. This reduced latency by 68% while maintaining an 85% human agreement score.`;
  }

  // 10. Product Philosophy, Strategy & Prioritization
  if (/prioriti(ze|zation)|framework|strategy|roadmap|decide what to build/i.test(q)) {
    return `At Indegene and Datawrkz, I rooted prioritization in high-signal customer telemetry and clear business leverage. Using structured frameworks like RICE and Opportunity Solution Trees, I balance 0-to-1 discovery spikes with scalable platform engineering. My guiding principle is shortening customer time-to-value while de-risking technical execution early.`;
  }

  // 11. Overcoming Potential Blockers or Unfamiliar Technologies Positively
  if (/experience with|background in|familiar with/i.test(q)) {
    return `At Indegene and Datawrkz, I repeatedly mastered complex emerging domains, from enterprise AI agent orchestration and LLM evaluation rubrics to high-throughput programmatic ad exchanges. My strength is rapidly deconstructing architectural stacks, translating business and user needs into crisp product specs, and executing with high ownership to ship production-ready platforms immediately.`;
  }

  // 12. General Comprehensive Fallback
  return `As Founding PM at Indegene and previously at Datawrkz, I bring deep hands-on experience building 0-to-1 B2B platforms, enterprise AI agent workflows, and scalable data products. With an MBA from IIM Kashipur and a B.Arch from NIT Patna, I combine high-velocity execution, technical depth, and strong commercial focus.`;
}

module.exports = {
  CANDIDATE_PROFILE,
  RESUMES_DIR,
  selectBestResume,
  generateCoverLetter,
  answerCustomQuestion
};
