const fs = require('fs');
const path = require('path');

/**
 * Autonomous Job Application Tracker (Phase 2)
 * Maintains persistent tracking of all job application scans, form fills,
 * live submissions, and login/account creation gate challenges.
 */

const STATUS = {
  VERIFIED: 'VERIFIED',
  FILLED: 'FILLED',
  SUBMITTED: 'SUBMITTED',
  ACCOUNT_CREATION_REQUIRED: 'ACCOUNT_CREATION_REQUIRED',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  CAREER_INDEX: 'CAREER_INDEX',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED'
};

const DEFAULT_JSON_PATH = path.join(process.cwd(), 'application_tracker.json');
const DEFAULT_ARTIFACT_DIR = '/Users/akkic/.gemini/antigravity/brain/fc7890c9-db97-47fd-b41e-9c0632e383d1';

class ApplicationTracker {
  constructor(jsonPath = DEFAULT_JSON_PATH, artifactDir = DEFAULT_ARTIFACT_DIR) {
    this.jsonPath = jsonPath;
    this.artifactDir = artifactDir;
    this.records = this.loadRecords();
  }

  loadRecords() {
    try {
      if (fs.existsSync(this.jsonPath)) {
        const raw = fs.readFileSync(this.jsonPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`[ApplicationTracker] Could not load ${this.jsonPath}: ${err.message}`);
    }
    return [];
  }

  saveRecords() {
    try {
      const dir = path.dirname(this.jsonPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.jsonPath, JSON.stringify(this.records, null, 2), 'utf-8');

      // Mirror to artifact directory if different
      if (this.artifactDir && fs.existsSync(this.artifactDir)) {
        const artifactJsonPath = path.join(this.artifactDir, 'application_tracker.json');
        if (artifactJsonPath !== this.jsonPath) {
          fs.writeFileSync(artifactJsonPath, JSON.stringify(this.records, null, 2), 'utf-8');
        }
      }
    } catch (err) {
      console.warn(`[ApplicationTracker] Could not save records: ${err.message}`);
    }
  }

  /**
   * Add or update an application record.
   * Deduplicates by jobUrl.
   */
  record(entry) {
    const existingIndex = this.records.findIndex(r => r.jobUrl && r.jobUrl === entry.jobUrl);
    const id = existingIndex >= 0 ? this.records[existingIndex].id : `APP-${String(this.records.length + 1).padStart(3, '0')}`;
    const timestamp = entry.timestamp || new Date().toISOString();

    const normalizedRecord = {
      id,
      timestamp,
      role: entry.role || entry.jobTitle || 'Product Manager',
      company: entry.company || entry.companyName || 'Not Detected',
      recruiter: entry.recruiter || entry.author || 'Hiring Team',
      portalType: entry.portalType || this.detectPortalType(entry.jobUrl),
      jobUrl: entry.jobUrl || '',
      matchedResume: entry.matchedResume || 'Chetan_CV_B2BSaaS_PM_V4.pdf',
      resumeCategory: entry.resumeCategory || 'PM',
      fieldsFilled: entry.fieldsFilled || 0,
      totalFields: entry.totalFields || entry.fieldsFilled || 0,
      status: entry.status || STATUS.VERIFIED,
      formFilledScreenshot: entry.formFilledScreenshot || null,
      submittedScreenshot: entry.submittedScreenshot || null,
      challenges: entry.challenges || 'None',
      notes: entry.notes || ''
    };

    if (existingIndex >= 0) {
      this.records[existingIndex] = { ...this.records[existingIndex], ...normalizedRecord };
    } else {
      this.records.push(normalizedRecord);
    }

    this.saveRecords();
    return normalizedRecord;
  }

  detectPortalType(url = '') {
    const u = (url || '').toLowerCase();
    if (u.includes('linkedin.com/jobs')) return 'LinkedIn Easy Apply';
    if (u.includes('greenhouse.io')) return 'Greenhouse';
    if (u.includes('lever.co')) return 'Lever';
    if (u.includes('ashbyhq.com')) return 'Ashby';
    if (u.includes('bamboohr.com')) return 'BambooHR';
    if (u.includes('smartrecruiters.com')) return 'SmartRecruiters';
    if (u.includes('forms.gle') || u.includes('docs.google.com/forms')) return 'Google Forms';
    if (u.includes('workday') || u.includes('myworkdayjobs.com')) return 'Workday';
    if (u.includes('taleo.net')) return 'Taleo';
    if (u.includes('icims.com')) return 'iCIMS';
    if (u.includes('workable.com')) return 'Workable';
    return 'Custom Career Portal';
  }

  /**
   * Helper to format a file link for markdown using file:// and basename.
   */
  formatFileLink(filePath) {
    if (!filePath) return 'N/A';
    const basename = path.basename(filePath);
    let absPath = filePath;
    if (!path.isAbsolute(absPath) && this.artifactDir) {
      absPath = path.join(this.artifactDir, basename);
    }
    return `[${basename}](file://${absPath})`;
  }

  /**
   * Generate comprehensive Markdown tracker artifact.
   */
  generateMarkdown() {
    const now = new Date().toLocaleString();
    const total = this.records.length;
    const submittedCount = this.records.filter(r => r.status === STATUS.SUBMITTED).length;
    const filledCount = this.records.filter(r => r.status === STATUS.FILLED).length;
    const verifiedCount = this.records.filter(r => r.status === STATUS.VERIFIED).length;
    const gatedCount = this.records.filter(r => r.status === STATUS.ACCOUNT_CREATION_REQUIRED || r.status === STATUS.LOGIN_REQUIRED).length;
    const indexCount = this.records.filter(r => r.status === STATUS.CAREER_INDEX).length;

    const md = [];
    md.push('# Autonomous Job Application & Submission Tracker (Phase 2)\n\n');
    md.push(`**Tracker Last Updated**: ${now}  \n`);
    md.push(`**Candidate**: Chetan (Indegene Founding PM - AI Platforms / ex-Datawrkz)  \n`);
    md.push(`**Core Parameters**: Notice Period: 30 days | Current CTC: 29 LPA (27L Fixed + 2L Variable) | Expected CTC: 40 LPA | Location: Bangalore (Open to Relocation & Remote & Global with Visa)  \n`);
    md.push(`**Total Portals Tracked**: ${total}  \n\n`);

    md.push('## 1. Pipeline Status Breakdown\n\n');
    md.push('| Status Category | Count | Operational Definition & Handling Policy |\n');
    md.push('|---|:---:|---|\n');
    md.push(`| 🚀 **SUBMITTED** | **${submittedCount}** | Form successfully filled, validated, submitted live to employer, and confirmation screenshot captured. |\n`);
    md.push(`| 🛡️ **FILLED** | **${filledCount}** | All form fields populated, custom Indegene/Datawrkz PM answers injected, matched CV attached, and pre-submission review screenshot captured. |\n`);
    md.push(`| 🔍 **VERIFIED** | **${verifiedCount}** | Job posting verified as direct application form; fields scanned and validated against candidate profile schema. |\n`);
    md.push(`| 🔐 **ACCOUNT_CREATION_REQUIRED** | **${gatedCount}** | Mandatory candidate login/registration wall detected (e.g. Workday, Taleo). Form filling bypassed per policy; logged with direct link for candidate awareness. |\n`);
    md.push(`| 📁 **CAREER_INDEX** | **${indexCount}** | Multi-role career search directory rather than a direct role application form. |\n\n`);

    md.push('---\n\n');
    md.push('## 2. Master Job Application Tracking Table\n\n');
    md.push('| ID | Role Title | Company / Recruiter | Portal Type | Target Job Link | Resume Deployed | Fields | Status | Form Filled Proof | Submitted Proof | Challenges / Notes |\n');
    md.push('|:---:|---|---|---|---|---|:---:|:---:|:---:|:---:|---|\n');

    for (const r of this.records) {
      const roleStr = `**${r.role}**`;
      const compStr = r.company && r.company !== 'Not Detected' ? `**${r.company}** (${r.recruiter})` : `**${r.recruiter}**`;
      const linkStr = `[Job Link](${r.jobUrl})`;
      const resStr = r.matchedResume ? `\`${path.basename(r.matchedResume)}\`` : 'N/A';
      const fieldsStr = `${r.fieldsFilled}/${r.totalFields}`;
      
      let statusBadge = r.status;
      if (r.status === STATUS.SUBMITTED) statusBadge = '🚀 **SUBMITTED**';
      else if (r.status === STATUS.FILLED) statusBadge = '🛡️ **FILLED**';
      else if (r.status === STATUS.VERIFIED) statusBadge = '🔍 **VERIFIED**';
      else if (r.status === STATUS.ACCOUNT_CREATION_REQUIRED) statusBadge = '🔐 **ACCOUNT_REQUIRED**';
      else if (r.status === STATUS.LOGIN_REQUIRED) statusBadge = '🔐 **LOGIN_REQUIRED**';
      else if (r.status === STATUS.CAREER_INDEX) statusBadge = '📁 **CAREER_INDEX**';

      const filledProof = this.formatFileLink(r.formFilledScreenshot);
      const submitProof = this.formatFileLink(r.submittedScreenshot);
      const notesStr = r.challenges !== 'None' ? `⚠️ **Challenge**: ${r.challenges}` : (r.notes || 'Clean execution');

      md.push(`| **${r.id}** | ${roleStr} | ${compStr} | \`${r.portalType}\` | ${linkStr} | ${resStr} | ${fieldsStr} | ${statusBadge} | ${filledProof} | ${submitProof} | ${notesStr} |\n`);
    }

    md.push('\n---\n\n');
    md.push('## 3. Bottleneck & Challenge Analysis\n\n');
    md.push('### A. Login & Account Creation Gates (Workday, Taleo, iCIMS)\n');
    md.push('- **Challenge**: Enterprise portals like Workday (`myworkdayjobs.com`), Taleo, and iCIMS enforce candidate registration with mandatory email verification codes, password complexity requirements, and multi-factor authentication before rendering application form fields.\n');
    md.push('- **Policy Applied**: In accordance with user guidelines, automated account creation is **strictly bypassed**. All such links are cataloged under `ACCOUNT_CREATION_REQUIRED` with their direct application URLs so Chetan can review or sign in if desired.\n\n');

    md.push('### B. Multi-Role Career Index Hubs vs Direct Job Forms\n');
    md.push('- **Challenge**: Feed posts occasionally link to top-level organizational careers hubs (e.g. `careers.smartrecruiters.com/Renaissance?search=remote`, `jobs.lever.co/MissionWired`) displaying search filters or lists rather than an active application form.\n');
    md.push('- **Policy Applied**: Classified as `CAREER_INDEX`. The pipeline flags these for candidate reference and focuses automated form filling on single-role direct openings.\n\n');

    md.push('### C. Direct Form & Easy Apply Success (BambooHR, Greenhouse, Google Forms, LinkedIn)\n');
    md.push('- **Success**: Direct ATS portals (BambooHR, Greenhouse single-role postings, Google Forms, and authenticated LinkedIn Easy Apply) are 100% automated: extracting questions, injecting Indegene and Datawrkz high-impact PM answers, attaching domain-matched PDF CVs, and reaching review/submission screens with visual screenshot evidence.\n\n');

    md.push('---\n\n');
    md.push('*Tracker automatically maintained by Antigravity Phase 2 Autonomous Job Application Suite.*\n');

    return md.join('');
  }

  /**
   * Export markdown tracker to artifact directory.
   */
  exportMarkdown(targetFile) {
    const md = this.generateMarkdown();
    const outPath = targetFile || path.join(this.artifactDir, 'job_application_tracker.md');
    fs.writeFileSync(outPath, md, 'utf-8');
    return outPath;
  }
}

// Singleton tracker instance for convenience
const defaultTracker = new ApplicationTracker();

module.exports = {
  ApplicationTracker,
  STATUS,
  defaultTracker
};
