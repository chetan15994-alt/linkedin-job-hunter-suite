# LinkedIn Job Hunter & Post Intelligence Suite

[![Tests](https://img.shields.io/badge/tests-20%20passing-brightgreen.svg)](test/core.test.js)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, agentic intelligence suite designed to discover, expand, export, and analyze hiring posts across LinkedIn **Saved Items**, **Feed / For You (`/feed/foryou/`)**, and **Curated Search Queries**. 

The system automatically extracts direct recruiter contact email addresses, maps opportunities against Chetan's 6 specialized Product Management resume variants with fit rationales, and provides automated, quota-safe email outreach and follow-up workflows.

> **Disclaimer**: Unofficial community tool for personal career discovery. Not affiliated with or endorsed by LinkedIn or Microsoft. Use responsibly and in accordance with applicable LinkedIn user agreements and rate limits.

---

## Key Capabilities

### 1. Three High-Yield Extraction Modes
- **Mode 1: Saved Posts (`/my-items/saved-posts/`)**: Export and filter saved bookmarks by customizable age boundaries (e.g. `14 days`, `3 months to 6 months`, or `all time`).
- **Mode 2: Feed / For You (`/feed/foryou/`)**: Continuously scrolls your live recommendation stream, expands truncated posts (clicking `...more`, `…more`, `see more`), and collects updates up to a configurable click budget (default: 1,000 clicks).
- **Mode 3: 10 Curated Search Queries**: Automatically runs targeted search queries across LinkedIn content with custom click budgets (default: 100 or 200 clicks per query), uncovering posts where hiring managers share direct email addresses or referral links.

### 2. Bulletproof Stealth & Anti-Bot Protection
- **Pre-flight Profile Sanitization**: Automatically rewrites Chrome `Preferences` and `Local State` prior to launch (`exit_type: Normal`, `exited_cleanly: true`), permanently eliminating the *"Restore pages? Chromium didn't shut down correctly"* dialog.
- **Authentic Google Chrome Binary Execution**: Detects and launches the real system Google Chrome binary (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`), presenting genuine Google code signing, GPU hardware acceleration, and Widevine DRM signatures.
- **Runtime Fingerprint Cloaking**: Injects stealth shims that remove `navigator.webdriver`, mock `window.chrome.runtime`, and provide authentic plugin and permissions signatures to pass Sentinel and Cloudflare Turnstile verification.
- **Natural Humanized Pacing**: Randomizes dwell pauses (4 to 8 seconds) between successive queries and applies variable scroll chunks (950px - 1350px) with jittered sleep intervals.
- **Canvas Memory Safety**: Prevents Chromium GPU renderer buffer overflows on large 400+ post runs by decoupling paginated PDF generation from viewport screenshots.

### 3. Automated Post Analysis & Resume Variant Matching
- Extracts direct recruiter email addresses while filtering out support and system mailboxes.
- Detects hiring intent, company names, and specific PM specializations.
- Intelligently scores and pairs each role with Chetan's 6 specialized resume variants in `resumes_chetan/`:
  - `Chetan_CV_Agentic_PM_V4.pdf` (Agentic AI, LLM Evaluation & Applied AI)
  - `Chetan_CV_B2BSaaS_PM_V4.pdf` (B2B SaaS, Enterprise Platforms & 0-to-1)
  - `Chetan_CV_Growth_PM_V4.pdf` (Growth, Activation, PLG & Retention)
  - `Chetan_CV_Technical_PM_V4.pdf` (Technical PM, APIs & Telemetry)
  - `Chetan_Resume_-_Regulated_HealthTech_V4.pdf` (Regulated HealthTech, Medical AI & Life Sciences)
  - `Chetan_CV_AdTech_PM_V4.pdf` (AdTech, SSP, Prebid, GAM/AdX & Yield Monetization)

### 4. Quota-Safe Email Outreach & Smart Follow-Up Engine
- **Automated Paced Dispatch**: Sends personalized application emails with matching CV PDFs via the Gmail CLI (`gmail mutate send-with-attachment`).
- **Quota Protection**: Incorporates 6 to 7.5 second pauses between messages, 25-second cooling breaks every 5 sends, and automated 40-second backoffs against Google Gmail API per-minute limits (6,000 units/min).
- **Persistent Audit Logging**: Every dispatch is tracked in `dispatch_log.json` to enforce strict deduplication (previously contacted recruiters are never re-sent).
- **Smart Non-Responder Follow-up**: Integrates with Gmail thread search to follow up only with recruiters who haven't replied.

---

## Repository Structure

```
.
├── src/
│   ├── index.js          # Core CLI orchestrator & export pipeline
│   ├── dom.js            # DOM extraction, button expansion & post scanner
│   ├── queries.js        # 10 curated PM/SPM search query definitions
│   ├── matcher.js        # Post-processing analyzer & resume matcher
│   └── stealth.js        # Profile sanitizer & anti-bot stealth shims
├── test/
│   └── core.test.js      # 20-spec unit test suite
├── resumes_chetan/       # 6 specialized PM CV variants
├── docs/                 # Documentation assets
├── package.json          # Node.js project manifest & scripts
├── LICENSE               # MIT License
└── README.md             # Project documentation
```

---

## 10 Curated Search Queries

| # | Category | Target Focus & Keywords |
|:---:|---|---|
| **1** | **Agentic AI / Applied AI** | `hiring "AI Product Manager" email` |
| **2** | **B2B SaaS / Platforms** | `hiring "Senior Product Manager" "B2B SaaS" email` |
| **3** | **Growth & Monetization** | `hiring "Growth Product Manager" email` |
| **4** | **Technical PM / APIs** | `hiring "Technical Product Manager" email` |
| **5** | **Founding PM / 0-to-1** | `hiring "Founding Product Manager" email` |
| **6** | **HealthTech / Life Sciences** | `hiring "HealthTech" "Product Manager" email` |
| **7** | **AdTech / Programmatic** | `hiring "AdTech" "Product Manager" email` |
| **8** | **Visa Sponsorship / Global** | `hiring "Product Manager" "visa sponsorship"` |
| **9** | **Remote Global PM** | `hiring "Product Manager" "remote" email` |
| **10** | **Product Leadership** | `hiring "Principal Product Manager" email` |

---

## Installation & Setup

### Prerequisites
- Node.js 20+
- Google Chrome (installed on host)
- Playwright Chromium dependencies

```bash
# Clone the repository
git clone https://github.com/chetan15994-alt/linkedin-job-hunter-suite.git
cd linkedin-job-hunter-suite

# Install dependencies
npm install
npm run setup
```

---

## CLI Usage

### Interactive Menu
```bash
npm start
```
Presents an interactive selector for Mode 1 (Saved Posts), Mode 2 (Feed), or Mode 3 (Search Queries).

### Direct CLI Commands

```bash
# 1. Search Mode: Run all 10 queries with 100 clicks per query
npm run export -- search 100

# 2. Search Mode: Run all 10 queries with 200 clicks per query
npm run export -- search 200

# 3. Search Mode: Target a specific query (e.g. Query 1: AI PM with 100 clicks)
npm run export -- search-query 1 100

# 4. Feed Mode: Scrape live feed with 1000 clicks
npm run export -- feed 1000

# 5. Saved Posts Mode: Export bookmarks by age
npm run export -- saved 14 days
npm run export -- saved 3 months to 6 months
npm run export -- saved all
```

---

## Testing & Quality Assurance

The suite includes 20 comprehensive unit tests covering date parsing, boundary selection, query definitions, email extraction, role detection, resume matching heuristics, stealth launch parameters, and profile sanitization:

```bash
npm run verify
```

Output:
```
✔ period parser
✔ age parser
✔ recent selection
✔ range normalizes boundaries
✔ all-time selection
✔ range filtering is inclusive
✔ 10 search queries are defined and complete
✔ visa-sponsored query is present in queries
✔ extractEmails detects valid emails and filters image extensions
✔ isHiringPost detects hiring intent
✔ detectRole accurately classifies roles
✔ matchResume accurately identifies Agentic AI role
✔ matchResume accurately identifies AdTech role
✔ matchResume accurately identifies Growth PM role
✔ matchResume accurately identifies Regulated HealthTech role
✔ matchResume accurately identifies Technical PM role
✔ matchResume accurately identifies B2B SaaS role
✔ analyzePosts extracts hiring details and matches resumes
✔ stealth launch args include anti-detection and crash-prevention flags
✔ sanitizeChromeProfile handles missing or existing preferences cleanly
ℹ tests 20 | pass 20 | fail 0
```

---

## License

This project is licensed under the [MIT License](LICENSE).
