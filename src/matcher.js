const fs = require('node:fs');
const path = require('node:path');
const { detectCountry, detectWorkArrangement } = require('./international');

const RESUME_VARIANTS = {
  AGENTIC: {
    file: 'Chetan_CV_Agentic_PM_V4.pdf',
    title: 'Agentic AI & Applied AI PM',
    keywords: [
      'agentic', 'agent', 'agents', 'evalagent', 'cockpit', 'llm', 'llms',
      'generative ai', 'genai', 'ai platform', 'ai-first', 'guardrails',
      'prompt engineering', 'reasoning', 'autonomous', 'human-in-the-loop', 'hitl'
    ],
    pitch: "Founding PM for Indegene's AI platform portfolio; built EvalAgent (multi-step trace auditing, 85% human agreement) and COCKPIT (self-healing QA agents)."
  },
  ADTECH: {
    file: 'Chetan_CV_AdTech_PM_V4.pdf',
    title: 'AdTech, SSP & Publisher Monetization PM',
    keywords: [
      'adtech', 'ad-tech', 'ad tech', 'programmatic', 'ssp', 'dsp', 'supply-side',
      'demand-side', 'header bidding', 'prebid', 'openrtb', 'google ad manager',
      'gam', 'adx', 'ecpm', 'viewability', 'yield', 'publisher', 'monetization', 'retail media'
    ],
    pitch: "Shipped Datawrkz's supply-side platform (highR) 0-to-1 to 100+ publishers, integrating Prebid, OpenRTB, GAM/AdX, and custom yield pricing (+10% earnings)."
  },
  B2BSAAS: {
    file: 'Chetan_CV_B2BSaaS_PM_V4.pdf',
    title: 'B2B SaaS & Enterprise Platforms PM',
    keywords: [
      'b2b saas', 'enterprise platform', '0-to-1', 'customer onboarding',
      'activation', 'churn', 'retention', 'renewal', 'workflow automation',
      'internal tools', 'enterprise', 'saas'
    ],
    pitch: "Shipped B2B SaaS from 0-to-1 in <6 months; overhauled onboarding to lift activation from 25% to 55% (2x customers, 3x revenue) and boosted retention 35%."
  },
  GROWTH: {
    file: 'Chetan_CV_Growth_PM_V4.pdf',
    title: 'Growth, Activation & Retention PM',
    keywords: [
      'growth', 'plg', 'a/b testing', 'experimentation', 'funnel', 'cohort',
      'conversion', 'activation', 'retention', 'churn reduction', 'monetization',
      'arpu', 'acquisition', 'consumer', 'b2c'
    ],
    pitch: "Data-driven experimentation leader; lifted activation 25%->55%, increased revenue per account 50%, and scaled consumer platforms at BYJU'S (30M+ user scale)."
  },
  TECHNICAL: {
    file: 'Chetan_CV_Technical_PM_V4.pdf',
    title: 'Technical PM & AI Platforms',
    keywords: [
      'technical product manager', 'tpm', 'api', 'apis', 'developer', 'architecture',
      'data pipeline', 'telemetry', 'instrumentation', 'sql', 'python',
      'system integration', 'backend'
    ],
    pitch: "Architected hybrid LLM evaluation systems benchmarked on 500+ traces at 1/3 commercial cost; hands-on with APIs, predictive ML modeling, and telemetry."
  },
  HEALTHTECH: {
    file: 'Chetan_Resume_-_Regulated_HealthTech_V4.pdf',
    title: 'Regulated HealthTech & Life Sciences PM',
    keywords: [
      'healthtech', 'health tech', 'healthcare', 'life sciences', 'medical',
      'pharma', 'clinical', 'pbm', 'payer', 'prescription', 'compliance',
      'regulatory', 'fda', 'hipaa', 'audit trail'
    ],
    pitch: "Founding PM for regulated medical AI safety and clinical content compliance at Indegene; cut review rework 50% with audit trails and HITL guardrails."
  }
};

function extractEmails(text) {
  const matches = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];
  const cleaned = matches.map(e => e.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toLowerCase());
  const valid = cleaned.filter(e => {
    if (!e.includes('@') || !e.includes('.')) return false;
    if (/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(e)) return false;
    if (/^(order|orders|support|help|billing|donotreply|noreply|no-reply|service|privacy|security)@/i.test(e)) return false;
    return true;
  });
  return [...new Set(valid)];
}

function isHiringPost(text) {
  const hiringRegex = /\b(hiring|we'?re hiring|we are hiring|looking for|open position|openings?|job opening|apply here|apply at|send your resume|send resume|share your cv|share cv|write to me at|careers?|recruiting)\b/i;
  return hiringRegex.test(text);
}

function detectRole(text) {
  const roles = [
    { name: 'AI Product Manager', pattern: /\b(?:ai|agentic|generative ai|llm)\s+(?:product manager|pm)\b/i },
    { name: 'Founding Product Manager', pattern: /\bfounding\s+(?:product manager|pm)\b/i },
    { name: 'Group / Principal Product Manager', pattern: /\b(?:group|principal|lead|staff|director of)\s+(?:product manager|pm|product)\b/i },
    { name: 'Senior Product Manager - Growth', pattern: /\b(?:senior\s+)?(?:product manager|pm)\s*[-–—|]\s*growth\b|\bgrowth\s+(?:product manager|pm)\b/i },
    { name: 'Senior Product Manager', pattern: /\b(?:senior|sr\.?)\s+(?:product manager|pm)\b/i },
    { name: 'Technical Product Manager', pattern: /\b(?:technical|platform|api)\s+(?:product manager|pm|tpm)\b/i },
    { name: 'Product Manager', pattern: /\b(?:product manager|pm)\b/i }
  ];
  for (const r of roles) {
    if (r.pattern.test(text)) return r.name;
  }
  return 'Product Manager';
}

function detectCompany(text, author) {
  const atMatch = text.match(/(?:at|join|with|for)\s+([A-Z][A-Za-z0-9&]+(?:\s+[A-Z][A-Za-z0-9&]+){0,2})/);
  if (atMatch && !['LinkedIn', 'Remote', 'Bangalore', 'Gurugram', 'Noida', 'India', 'We'].includes(atMatch[1])) {
    return atMatch[1].replace(/[\r\n|]+/g, ' ').trim();
  }
  const authorClean = (author || '').replace(/View .* profile/i, '').replace(/•.*$/g, '').trim();
  const orgMatch = authorClean.match(/@\s*([A-Za-z0-9&]+)/);
  if (orgMatch) return orgMatch[1].replace(/[\r\n|]+/g, ' ').trim();
  return (authorClean.split('\n')[0].trim() || 'Tech Company').replace(/[\r\n|]+/g, ' ').trim();
}

function matchResume(text) {
  const lower = text.toLowerCase();
  const scores = {};
  
  for (const [key, variant] of Object.entries(RESUME_VARIANTS)) {
    let score = 0;
    for (const kw of variant.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches) {
        score += matches.length * (kw.length > 5 ? 2 : 1);
      }
    }
    scores[key] = score;
  }
  
  // Specific boost for explicit titles
  if (/\b(?:agentic|ai agent|evalagent|llm|generative ai)\b/i.test(lower)) scores.AGENTIC += 10;
  if (/\b(?:adtech|programmatic|ssp|dsp|retail media|gam)\b/i.test(lower)) scores.ADTECH += 10;
  if (/\b(?:healthcare|healthtech|life sciences|clinical|pbm)\b/i.test(lower)) scores.HEALTHTECH += 10;
  if (/\b(?:growth|funnel|conversion|a\/b test)\b/i.test(lower)) scores.GROWTH += 10;
  if (/\b(?:technical pm|tpm|developer platform|api architecture)\b/i.test(lower)) scores.TECHNICAL += 8;
  
  // Find highest scoring variant
  let bestKey = 'B2BSAAS';
  let bestScore = -1;
  for (const [key, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  
  // If no strong signal, default to Agentic or B2B SaaS
  if (bestScore === 0) {
    bestKey = /\bai\b/i.test(lower) ? 'AGENTIC' : 'B2BSAAS';
  }
  
  const chosen = RESUME_VARIANTS[bestKey];
  return {
    variantKey: bestKey,
    resumeFile: chosen.file,
    resumeTitle: chosen.title,
    pitch: chosen.pitch,
    score: bestScore
  };
}

function analyzePosts(posts) {
  const results = [];
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const text = post.text || '';
    const emails = extractEmails(text);
    const hiring = isHiringPost(text);
    
    // Only analyze posts that either have hiring intent or email IDs
    if (!hiring && emails.length === 0) continue;
    
    const role = detectRole(text);
    const company = detectCompany(text, post.author);
    const match = matchResume(text);
    const country = detectCountry(text);
    const workArrangement = detectWorkArrangement(text);
    
    results.push({
      postIndex: i + 1,
      author: post.author || 'Unknown',
      company,
      role,
      country,
      workArrangement,
      emails,
      url: post.url || '',
      age: post.age || 'Recent',
      bestResume: match.resumeFile,
      resumeTitle: match.resumeTitle,
      fitRationale: match.pitch,
      summary: text.slice(0, 200).replace(/\n+/g, ' ')
    });
  }
  return results;
}

function getPreviouslySeenEmails() {
  const seen = new Map();
  const logPaths = [
    path.join(process.cwd(), '../.gemini/antigravity/brain/fc7890c9-db97-47fd-b41e-9c0632e383d1/scratch/dispatch_log.json'),
    '/Users/akkic/.gemini/antigravity/brain/fc7890c9-db97-47fd-b41e-9c0632e383d1/scratch/dispatch_log.json'
  ];
  for (const p of logPaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        for (const item of data) {
          if (item.to_email && item.status === 'SUCCESS') {
            seen.set(item.to_email.toLowerCase().trim(), 'Fetched earlier / Emailed');
          }
        }
      } catch (e) {}
    }
  }
  return seen;
}

function generateAnalysisReport(analysisResults, sourceLabel) {
  const withEmails = analysisResults.filter(r => r.emails.length > 0);
  const otherHiring = analysisResults.filter(r => r.emails.length === 0);
  const previouslySeen = getPreviouslySeenEmails();
  
  let md = `# LinkedIn Hiring Analysis & Resume Matching Report\n\n`;
  md += `**Source**: ${sourceLabel}\n`;
  md += `**Generated At**: ${new Date().toLocaleString()}\n`;
  md += `**Total Hiring Posts Found**: ${analysisResults.length}\n`;
  md += `**Direct Email Outreach Opportunities**: ${withEmails.length}\n\n`;
  
  md += `## 1. Consolidated Direct Recruiter Email Outreach Opportunities (${withEmails.length})\n\n`;
  md += `| # | Company | Role | Target Country / Region | Work Model / Visa | Recruiter Email | Best Resume Variant | Post Date / Age | Category / Status | Why Chetan Fits |\n`;
  md += `|:---:|---|---|---|---|---|---|:---:|:---:|---|\n`;
  
  withEmails.forEach((r, idx) => {
    const emailsStr = r.emails.map(e => `\`${e}\``).join(', ');
    const isPrev = r.emails.some(e => previouslySeen.has(e.toLowerCase().trim()));
    const status = isPrev ? 'Duplicate / Fetched earlier' : 'Fresh Opportunity';
    const comp = (r.company || 'Tech Company').replace(/[\r\n|]+/g, ' ').trim();
    const role = (r.role || 'Product Manager').replace(/[\r\n|]+/g, ' ').trim();
    const country = (r.country || 'Global / Unspecified').replace(/[\r\n|]+/g, ' ').trim();
    const work = (r.workArrangement || 'Flexible').replace(/[\r\n|]+/g, ' ').trim();
    const age = (r.age || 'Recent').replace(/[\r\n|]+/g, ' ').trim();
    const rationale = (r.fitRationale || '').replace(/[\r\n|]+/g, ' ').trim();
    md += `| **${idx + 1}** | **${comp}** | ${role} | ${country} | ${work} | ${emailsStr} | \`${r.bestResume}\` | ${age} | **${status}** | ${rationale} |\n`;
  });
  
  if (otherHiring.length > 0) {
    md += `\n## 2. Other Key Hiring Openings (${otherHiring.length})\n\n`;
    md += `| # | Company | Role | Target Country | Work Model / Visa | Age | Best Resume Variant | Link / Source |\n`;
    md += `|:---:|---|---|---|---|:---:|---|---|\n`;
    otherHiring.slice(0, 40).forEach((r, idx) => {
      const linkStr = r.url ? `[LinkedIn Post](${r.url})` : 'LinkedIn Search / Feed';
      const country = (r.country || 'Global / Unspecified').replace(/[\r\n|]+/g, ' ').trim();
      const work = (r.workArrangement || 'Flexible').replace(/[\r\n|]+/g, ' ').trim();
      md += `| **${idx + 1}** | **${r.company}** | ${r.role} | ${country} | ${work} | ${r.age} | \`${r.bestResume}\` | ${linkStr} |\n`;
    });
  }
  
  return md;
}

function printConsoleSummaryTable(analysisResults) {
  const withEmails = analysisResults.filter(r => r.emails.length > 0);
  const previouslySeen = getPreviouslySeenEmails();
  console.log('\n' + '='.repeat(90));
  console.log(`🎯 CONSOLIDATED HIRING ANALYSIS: ${withEmails.length} DIRECT EMAIL OPPORTUNITIES FOUND`);
  console.log('='.repeat(90));
  
  withEmails.forEach((r, idx) => {
    const isPrev = r.emails.some(e => previouslySeen.has(e.toLowerCase().trim()));
    const status = isPrev ? '[DUPLICATE / FETCHED EARLIER]' : '[FRESH OPPORTUNITY]';
    console.log(`\n[#${idx + 1}] ${r.company} | ${r.role} | ${r.country} (${r.workArrangement}) | Post Age: ${r.age} ${status}`);
    console.log(`    📧 Contact: ${r.emails.join(', ')}`);
    console.log(`    📄 Resume:  ${r.bestResume} (${r.resumeTitle})`);
    console.log(`    💡 Pitch:   ${r.fitRationale}`);
  });
  console.log('\n' + '='.repeat(90));
}

module.exports = {
  RESUME_VARIANTS,
  extractEmails,
  isHiringPost,
  detectRole,
  detectCompany,
  matchResume,
  analyzePosts,
  generateAnalysisReport,
  printConsoleSummaryTable
};
