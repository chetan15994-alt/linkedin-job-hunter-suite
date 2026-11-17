#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const { expand, scan } = require('./dom');
const { SEARCH_QUERIES } = require('./queries');
const {
  GLOBAL_PM_QUERIES,
  TARGET_COUNTRIES,
  buildCountryQueries
} = require('./international');
const stealth = require('./stealth');
const {
  analyzePosts,
  generateAnalysisReport,
  printConsoleSummaryTable
} = require('./matcher');

const TARGET_SAVED = 'https://www.linkedin.com/my-items/saved-posts/';
const TARGET_FEED = 'https://www.linkedin.com/feed/foryou/';
const PROFILE = path.join(process.cwd(), '.linkedin-playwright-profile');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

// ==================== Saved Posts Parsers ====================

function parsePeriod(input) {
  const match = String(input || '').trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(d|day|days|w|week|weeks|mo|month|months|y|yr|year|years)$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!(value > 0 && value <= 1000)) return null;
  const raw = match[2];
  const unit = /^d/.test(raw) ? 'days' : /^w/.test(raw) ? 'weeks' : /^mo/.test(raw) ? 'months' : 'years';
  const days = unit === 'days' ? value : unit === 'weeks' ? value * 7 : unit === 'months' ? value * 30.4375 : value * 365.25;
  const suffix = unit === 'days' ? 'd' : unit === 'weeks' ? 'w' : unit === 'months' ? 'mo' : 'yr';
  return { value, unit, days, label: `${value} ${unit}`, slug: `${value}${suffix}` };
}

function parseAge(input) {
  const match = String(input || '').toLowerCase().replace(/\s+/g, '').match(/^(\d+(?:\.\d+)?)(min|m|h|d|w|mo|mos|yr|yrs|y)$/);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2];
  return unit === 'm' || unit === 'min' ? value / 1440 :
         unit === 'h' ? value / 24 :
         unit === 'd' ? value :
         unit === 'w' ? value * 7 :
         unit === 'mo' || unit === 'mos' ? value * 30.4375 :
         value * 365.25;
}

function parseSelection(args) {
  if (Array.isArray(args) && args.length === 2) {
    const p1 = parsePeriod(args[0]);
    const p2 = parsePeriod(args[1]);
    if (p1 && p2 && p1.days !== p2.days) {
      const min = p1.days < p2.days ? p1 : p2;
      const max = p1.days < p2.days ? p2 : p1;
      return { mode: 'range', minDays: min.days, maxDays: max.days, label: `${min.label} to ${max.label}`, slug: `${min.slug}-to-${max.slug}` };
    }
  }
  const text = args.join(' ').trim().toLowerCase();
  if (!text) return null;
  if (text === 'all' || text === 'all time' || text === 'all-time') {
    return { mode: 'all', minDays: 0, maxDays: Infinity, label: 'all time', slug: 'all-time' };
  }
  const parts = text.split(/\s+(?:to|through|-)\s+/);
  if (parts.length === 2) {
    const first = parsePeriod(parts[0]);
    const second = parsePeriod(parts[1]);
    if (!first || !second || first.days === second.days) return null;
    const min = first.days < second.days ? first : second;
    const max = first.days < second.days ? second : first;
    return { mode: 'range', minDays: min.days, maxDays: max.days, label: `${min.label} to ${max.label}`, slug: `${min.slug}-to-${max.slug}` };
  }
  const period = parsePeriod(text);
  return period ? { mode: 'recent', minDays: 0, maxDays: period.days, label: `up to ${period.label}`, slug: `up-to-${period.slug}` } : null;
}

async function askPeriod(reader, prompt) {
  while (true) {
    const value = parsePeriod(await reader.question(prompt));
    if (value) return value;
    console.log('Enter a value such as 14 days, 6 weeks, 3 months, or 1 year.');
  }
}

// ==================== Interactive Configuration ====================

async function promptMenu() {
  const args = process.argv.slice(2);
  
  // Direct CLI Argument Handling
  if (args.length > 0) {
    const firstArg = args[0].toLowerCase();
    
    // Check if apply mode (Phase 2): `npm run apply -- <url> [--mode=audit|dry-run|live] [--resume=<variant>]`
    if (firstArg === 'apply') {
      const url = args[1];
      if (!url || !url.startsWith('http')) {
        throw new Error('Please specify a valid job URL. Usage: node src/index.js apply <url> [--mode=audit|dry-run|live] [--resume=<variant>]');
      }
      let mode = 'dry-run';
      let resumeOverride = null;
      for (let i = 2; i < args.length; i++) {
        const a = args[i];
        if (a.startsWith('--mode=')) mode = a.split('=')[1].toLowerCase();
        if (a === '--audit') mode = 'audit';
        if (a === '--live') mode = 'live';
        if (a === '--dry-run') mode = 'dry-run';
        if (a.startsWith('--resume=')) resumeOverride = a.split('=')[1];
      }
      return {
        type: 'apply',
        url,
        options: { mode, resumeOverride },
        label: `Autonomous Job Application (${mode.toUpperCase()}) - ${url}`,
        slug: `apply-${mode}`
      };
    }

    // Check if feed mode
    if (firstArg === 'feed' || firstArg === 'for-you' || firstArg === 'foryou') {
      const budget = Number(args[1]) || 1000;
      return { type: 'feed', targetClicks: budget, label: `Feed / For You (${budget} clicks)`, slug: `feed-${budget}clicks` };
    }
    
    // Check if search mode
    if (firstArg === 'search') {
      const budget = Number(args[1]) || 200;
      return { type: 'search', targetClicksPerQuery: budget, querySelection: 'all', label: `Search 10 Queries (${budget} clicks/query)`, slug: `search-10queries-${budget}clicks` };
    }
    
    if (firstArg === 'search-query') {
      const qId = Number(args[1]) || 1;
      const budget = Number(args[2]) || 200;
      return { type: 'search', targetClicksPerQuery: budget, querySelection: qId, label: `Search Query #${qId} (${budget} clicks)`, slug: `search-q${qId}-${budget}clicks` };
    }

    // Check if global / international / visa mode
    if (firstArg === 'global' || firstArg === 'international' || firstArg === 'visa') {
      const secondArg = args[1];
      const thirdArg = args[2];
      
      // If secondArg is a number (e.g. `npm run export -- global 100`)
      if (secondArg && /^\d+$/.test(secondArg)) {
        const budget = Number(secondArg);
        return {
          type: 'global',
          targetClicksPerQuery: budget,
          queriesToRun: GLOBAL_PM_QUERIES,
          label: `Global PM Job Hunter - 12 Regional Clusters (15 Countries, ${budget} clicks/query)`,
          slug: `global-15countries-12clusters-${budget}clicks`
        };
      }
      
      // If secondArg is a country name or code
      if (secondArg) {
        const customQueries = buildCountryQueries(secondArg);
        if (customQueries) {
          const budget = Number(thirdArg) || 100;
          const countryObj = TARGET_COUNTRIES.find(c =>
            c.id.toLowerCase() === secondArg.toLowerCase() ||
            c.name.toLowerCase().includes(secondArg.toLowerCase()) ||
            c.keywords.some(k => k.toLowerCase() === secondArg.toLowerCase())
          );
          const cName = countryObj ? countryObj.name : secondArg;
          const cSlug = countryObj ? countryObj.id.toLowerCase() : secondArg.toLowerCase();
          return {
            type: 'global',
            targetClicksPerQuery: budget,
            queriesToRun: customQueries,
            label: `Global PM Job Hunter - ${cName} (${budget} clicks/query)`,
            slug: `global-${cSlug}-${budget}clicks`
          };
        }
      }
      
      // Default global: all 12 queries, default 100 clicks
      const budget = 100;
      return {
        type: 'global',
        targetClicksPerQuery: budget,
        queriesToRun: GLOBAL_PM_QUERIES,
        label: `Global PM Job Hunter - 12 Regional Clusters (15 Countries, ${budget} clicks/query)`,
        slug: `global-15countries-12clusters-${budget}clicks`
      };
    }
    
    // Backwards compatible saved posts CLI: `npm run export -- saved 3 months` or `npm run export -- 3 months`
    const savedArgs = firstArg === 'saved' ? args.slice(1) : args;
    const selection = parseSelection(savedArgs);
    if (selection) {
      return { type: 'saved', selection, label: `Saved Posts (${selection.label})`, slug: `saved-${selection.slug}` };
    }
    throw new Error('Invalid arguments. Usage: npm start, or npm run export -- [saved "3 months" | feed [clicks] | search [clicks] | global [country] [clicks]]');
  }

  // Interactive CLI Menu
  const reader = readline.createInterface({ input: stdin, output: stdout });
  console.log('\n======================================================');
  console.log('   🚀 LinkedIn Job Hunter & Post Intelligence Suite');
  console.log('======================================================');
  console.log('What would you like to do?');
  console.log('  1. Export Saved Posts (from https://www.linkedin.com/my-items/saved-posts/)');
  console.log('  2. Scrape Feed / For You (from https://www.linkedin.com/feed/foryou/)');
  console.log('  3. Search LinkedIn Posts (across 10 curated PM/SPM hiring queries)');
  console.log('  4. Global & Remote PM Job Hunter (15 Countries + Visa Sponsorship & Remote)');
  console.log('  5. Autonomous Job Application Form Filler (Phase 2 - Form Apply with Resume)');
  
  let mainChoice;
  while (!['1', '2', '3', '4', '5'].includes(mainChoice)) {
    mainChoice = (await reader.question('\nSelect 1, 2, 3, 4, or 5: ')).trim();
    if (!['1', '2', '3', '4', '5'].includes(mainChoice)) console.log('Please enter 1, 2, 3, 4, or 5.');
  }

  // Mode 5: Autonomous Job Application Form Filler (Phase 2)
  if (mainChoice === '5') {
    let jobUrl = '';
    while (!jobUrl || !jobUrl.startsWith('http')) {
      jobUrl = (await reader.question('\nEnter job application URL (Greenhouse, Lever, Ashby, Workable, etc.): ')).trim();
      if (!jobUrl.startsWith('http')) console.log('Please enter a valid URL starting with http:// or https://');
    }

    console.log('\nSelect execution mode:');
    console.log('  1. dry-run (Default: Fill all fields, upload resume, verify and screenshot without clicking submit)');
    console.log('  2. audit   (Inspect form fields, generate fill plan and report without modifying page)');
    console.log('  3. live    (Fill all fields, upload resume, verify, and click submit application)');
    
    const modeChoice = (await reader.question('\nSelect mode [1, 2, or 3, default: 1]: ')).trim();
    let mode = 'dry-run';
    if (modeChoice === '2') mode = 'audit';
    else if (modeChoice === '3') mode = 'live';

    reader.close();
    return {
      type: 'apply',
      url: jobUrl,
      options: { mode },
      label: `Autonomous Job Application (${mode.toUpperCase()}) - ${jobUrl}`,
      slug: `apply-${mode}`
    };
  }

  // Mode 2: Feed / For You
  if (mainChoice === '2') {
    const inputClicks = (await reader.question('\nEnter click limit for expanding posts (default: 1000): ')).trim();
    const budget = Number(inputClicks) > 0 ? Number(inputClicks) : 1000;
    reader.close();
    return { type: 'feed', targetClicks: budget, label: `Feed / For You (${budget} clicks)`, slug: `feed-${budget}clicks` };
  }

  // Mode 3: Search Queries
  if (mainChoice === '3') {
    const inputClicks = (await reader.question('\nEnter click limit per search query (default: 200): ')).trim();
    const budget = Number(inputClicks) > 0 ? Number(inputClicks) : 200;
    
    console.log('\nSearch queries available:');
    SEARCH_QUERIES.forEach(q => console.log(`  ${q.id}. ${q.title} [${q.category}]`));
    console.log('  all. Run all 10 curated queries in sequence (Recommended)');
    
    const whichQuery = (await reader.question('\nSelect query [1-10 or all, default: all]: ')).trim().toLowerCase();
    const selectedQ = whichQuery && whichQuery !== 'all' && Number(whichQuery) >= 1 && Number(whichQuery) <= 10 ? Number(whichQuery) : 'all';
    
    reader.close();
    const labelStr = selectedQ === 'all' ? `Search 10 Queries (${budget} clicks/query)` : `Search Query #${selectedQ} (${budget} clicks)`;
    const slugStr = selectedQ === 'all' ? `search-10queries-${budget}clicks` : `search-q${selectedQ}-${budget}clicks`;
    return { type: 'search', targetClicksPerQuery: budget, querySelection: selectedQ, label: labelStr, slug: slugStr };
  }

  // Mode 4: Global & Remote PM Job Hunter (15 Countries + Visa Sponsorship & Remote)
  if (mainChoice === '4') {
    const inputClicks = (await reader.question('\nEnter click limit per search query (default: 100): ')).trim();
    const budget = Number(inputClicks) > 0 ? Number(inputClicks) : 100;

    console.log('\nSelect Search Scope:');
    console.log('  1. All 12 Regional & Global Clusters across all 15 countries (Recommended)');
    console.log('  2. Single Country Drill-down (Select from 15 Target Countries)');

    let scopeChoice = (await reader.question('\nSelect 1 or 2 [default: 1]: ')).trim();
    if (scopeChoice === '2') {
      console.log('\nSupported Target Countries:');
      TARGET_COUNTRIES.forEach((c, idx) => console.log(`  ${idx + 1}. ${c.name} [${c.id}] - ${c.region}`));
      const countryInput = (await reader.question('\nEnter country number (1-15) or name/code: ')).trim();
      let selectedCountry = null;
      const num = Number(countryInput);
      if (num >= 1 && num <= TARGET_COUNTRIES.length) {
        selectedCountry = TARGET_COUNTRIES[num - 1];
      } else if (countryInput) {
        selectedCountry = TARGET_COUNTRIES.find(c =>
          c.id.toLowerCase() === countryInput.toLowerCase() ||
          c.name.toLowerCase().includes(countryInput.toLowerCase()) ||
          c.keywords.some(k => k.toLowerCase() === countryInput.toLowerCase())
        );
      }

      if (selectedCountry) {
        const countryQueries = buildCountryQueries(selectedCountry.id);
        reader.close();
        return {
          type: 'global',
          targetClicksPerQuery: budget,
          queriesToRun: countryQueries,
          label: `Global PM Job Hunter - ${selectedCountry.name} (${budget} clicks/query)`,
          slug: `global-${selectedCountry.id.toLowerCase()}-${budget}clicks`
        };
      }
      console.log('Country not recognized, falling back to all 12 regional clusters.');
    }

    reader.close();
    return {
      type: 'global',
      targetClicksPerQuery: budget,
      queriesToRun: GLOBAL_PM_QUERIES,
      label: `Global PM Job Hunter - 12 Regional Clusters (15 Countries, ${budget} clicks/query)`,
      slug: `global-15countries-12clusters-${budget}clicks`
    };
  }

  // Mode 1: Saved Posts
  console.log('\nWhat period of Saved Posts would you like to export?');
  console.log('  1. Recent posts, from now up to a maximum age');
  console.log('  2. Posts within an age range, for example 3 months to 6 months');
  console.log('  3. All saved posts');
  
  let savedChoice;
  while (!['1', '2', '3'].includes(savedChoice)) {
    savedChoice = (await reader.question('\nSelect 1, 2, or 3: ')).trim();
    if (!['1', '2', '3'].includes(savedChoice)) console.log('Please enter 1, 2, or 3.');
  }

  if (savedChoice === '3') {
    reader.close();
    const selection = { mode: 'all', minDays: 0, maxDays: Infinity, label: 'all time', slug: 'all-time' };
    return { type: 'saved', selection, label: `Saved Posts (${selection.label})`, slug: `saved-${selection.slug}` };
  }

  if (savedChoice === '1') {
    const max = await askPeriod(reader, 'Maximum post age (example: 3 months): ');
    reader.close();
    const selection = { mode: 'recent', minDays: 0, maxDays: max.days, label: `up to ${max.label}`, slug: `up-to-${max.slug}` };
    return { type: 'saved', selection, label: `Saved Posts (${selection.label})`, slug: `saved-${selection.slug}` };
  }

  while (true) {
    const start = await askPeriod(reader, 'Newer boundary (example: 3 months): ');
    const end = await askPeriod(reader, 'Older boundary (example: 6 months): ');
    if (start.days !== end.days) {
      const min = start.days < end.days ? start : end;
      const max = start.days < end.days ? end : start;
      reader.close();
      const selection = { mode: 'range', minDays: min.days, maxDays: max.days, label: `${min.label} to ${max.label}`, slug: `${min.slug}-to-${max.slug}` };
      return { type: 'saved', selection, label: `Saved Posts (${selection.label})`, slug: `saved-${selection.slug}` };
    }
    console.log('The two boundaries must be different. Please try again.');
  }
}

// ==================== Authentication Handler ====================

async function ensureAuthenticated(page, targetUrl) {
  console.log(`\nNavigating to: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);

  const currentUrl = page.url();
  const needsAuth = /login|checkpoint|challenge|authwall/i.test(currentUrl) ||
                    currentUrl === 'https://www.linkedin.com/' ||
                    currentUrl === 'https://www.linkedin.com' ||
                    await page.evaluate(() => !!document.querySelector('#session_key, #username, input[name="session_key"], .sign-in-form'));

  if (needsAuth) {
    console.log('\n⚠️ Authentication Required:');
    console.log('Please log into your LinkedIn account in the opened Google Chrome browser.');
    
    // Auto-detect login when URL navigates away from login/checkpoint OR wait for Enter
    const autoDetect = page.waitForURL(url => {
      const u = url.toString();
      return !u.includes('login') && !u.includes('checkpoint') && !u.includes('authwall') && (u.includes('feed') || u.includes('linkedin.com/in/') || u.includes('search'));
    }, { timeout: 300000 }).catch(() => null);

    const reader = readline.createInterface({ input: stdin, output: stdout });
    const waitEnter = reader.question('Once you are logged in, press Enter here to continue... ').catch(() => '');

    await Promise.race([autoDetect, waitEnter]);
    try { reader.close(); } catch (e) {}
    await sleep(2500);

    if (!page.url().includes(targetUrl)) {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(2500);
    }
  }

  // Ensure main or body is visible
  await page.locator('main, body').first().waitFor({ state: 'visible', timeout: 30000 });
  await sleep(1500);
}

// ==================== Scrolling & DOM Helpers ====================

async function getScrollMetrics(page) {
  return await page.evaluate(() => {
    const el = document.getElementById('workspace') || document.querySelector('main') || document.documentElement;
    return {
      scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop || window.scrollY || 0,
      clientHeight: el.clientHeight || window.innerHeight || 0
    };
  });
}

async function scrollDown(page, distance = 1200) {
  return await page.evaluate((d) => {
    const el = document.getElementById('workspace') || document.querySelector('main');
    if (el) el.scrollBy({ top: d, behavior: 'smooth' });
    window.scrollBy({ top: d, behavior: 'smooth' });
  }, distance);
}

// ==================== Mode 1: Saved Posts Scraper ====================

async function runSavedScraper(page, config) {
  const selection = config.selection;
  await ensureAuthenticated(page, TARGET_SAVED);

  const allPostsMap = new Map();
  let clicks = 0, stable = 0, lastHeight = 0, lastCount = 0, reason = '';
  for (let round = 1; round <= 350; round++) {
    clicks += await expand(page);
    const visible = await scan(page);
    for (const p of visible) {
      const key = p.text.slice(0, 250);
      if (!allPostsMap.has(key)) {
        allPostsMap.set(key, p);
      }
    }
    const recognized = Array.from(allPostsMap.values());
    if (round === 2 && !recognized.length) {
      throw new Error('No timestamp-bearing posts recognized; LinkedIn markup may have changed.');
    }
    const selected = recognized.filter(post => post.days >= selection.minDays && post.days <= selection.maxDays);

    const { scrollHeight } = await getScrollMetrics(page);
    const isGrowing = scrollHeight > lastHeight + 50 || recognized.length > lastCount;
    stable = isGrowing ? 0 : stable + 1;
    lastHeight = scrollHeight;
    lastCount = recognized.length;

    console.log(`Round ${round}: recognized=${recognized.length}, selected=${selected.length}, oldest=${recognized.at(-1)?.age || 'none'}, clicks=${clicks}`);

    if (selection.mode !== 'all') {
      const bottom = recognized.slice(-5);
      if (bottom.length === 5 && bottom.every(post => post.days > selection.maxDays)) {
        return { posts: selected, totalClicks: clicks, stopReason: 'older-boundary' };
      }
    }
    if (stable >= 8) {
      return { posts: selected, totalClicks: clicks, stopReason: 'feed-end' };
    }

    await scrollDown(page, 1200);
    await sleep(1500);
  }
  const recognized = Array.from(allPostsMap.values());
  const selected = recognized.filter(post => post.days >= selection.minDays && post.days <= selection.maxDays);
  return { posts: selected, totalClicks: clicks, stopReason: reason || 'completed' };
}

// ==================== Mode 2: Feed / For You Scraper ====================

async function runFeedScraper(page, config) {
  const targetClicks = config.targetClicks;
  await ensureAuthenticated(page, TARGET_FEED);

  const allPostsMap = new Map();
  let totalClicks = 0, stableRounds = 0, lastHeight = 0, lastUniqueCount = 0, reason = '';
  console.log(`\nStarting Feed Scraper with target expand budget: ${targetClicks} clicks`);

  const maxRounds = Math.max(3000, targetClicks * 2);
  for (let round = 1; round <= maxRounds; round++) {
    const clickedThisRound = await expand(page);
    totalClicks += clickedThisRound;

    const visiblePosts = await scan(page);
    for (const p of visiblePosts) {
      const key = p.text.slice(0, 250);
      if (!allPostsMap.has(key)) {
        allPostsMap.set(key, p);
      }
    }

    const { scrollHeight } = await getScrollMetrics(page);
    const isGrowing = scrollHeight > lastHeight + 50 || allPostsMap.size > lastUniqueCount;
    stableRounds = isGrowing ? 0 : stableRounds + 1;
    lastHeight = scrollHeight;
    lastUniqueCount = allPostsMap.size;

    console.log(`Feed Round ${round}: clicks=${totalClicks}/${targetClicks} (+${clickedThisRound}), posts_recognized=${allPostsMap.size}`);

    if (totalClicks >= targetClicks) {
      reason = `Reached target budget of ${targetClicks} clicks`;
      break;
    }
    if (stableRounds >= 12) {
      reason = 'Feed end reached (no more posts loading)';
      break;
    }

    // Scroll down progressively to trigger infinite loading
    await scrollDown(page, 1200);
    await sleep(1500);
  }

  const posts = Array.from(allPostsMap.values());
  return { posts, totalClicks, stopReason: reason || 'budget-reached' };
}

// ==================== Mode 3: Search Query Scraper ====================

async function runSearchScraper(page, config) {
  const clicksPerQuery = config.targetClicksPerQuery;
  const queriesToRun = config.queriesToRun || (config.querySelection === 'all'
    ? SEARCH_QUERIES
    : SEARCH_QUERIES.filter(q => q.id === config.querySelection));

  await ensureAuthenticated(page, 'https://www.linkedin.com/feed/');

  const allPostsMap = new Map();
  let grandTotalClicks = 0;

  for (let i = 0; i < queriesToRun.length; i++) {
    const qObj = queriesToRun[i];
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(qObj.query)}&origin=GLOBAL_SEARCH_HEADER&sortBy=%22date_posted%22`;
    
    if (i > 0) {
      const waitSec = Math.floor(Math.random() * 4) + 4; // 4 to 7 seconds
      console.log(`  [Stealth Pacing] Waiting ${waitSec}s before next query to maintain session reputation...`);
      await sleep(waitSec * 1000);
    }

    console.log(`\n[Query ${i + 1}/${queriesToRun.length}] "${qObj.title}"`);
    console.log(`Search URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2500);

    // If redirected to login, alert user
    if (page.url().includes('login') || page.url().includes('checkpoint')) {
      console.warn('⚠️ Session checkpoint or login required. Pausing for human verification...');
      await page.waitForURL(url => !url.toString().includes('login') && !url.toString().includes('checkpoint'), { timeout: 120000 }).catch(() => {});
    }

    let queryClicks = 0, stable = 0, lastHeight = 0, lastCount = allPostsMap.size;
    const maxRounds = Math.max(800, clicksPerQuery);
    for (let round = 1; round <= maxRounds; round++) {
      const clicked = await expand(page);
      queryClicks += clicked;
      grandTotalClicks += clicked;

      const postsOnPage = await scan(page);
      for (const p of postsOnPage) {
        const key = p.text.slice(0, 250);
        if (!allPostsMap.has(key)) {
          allPostsMap.set(key, { ...p, sourceQuery: qObj.title });
        }
      }

      const { scrollHeight } = await getScrollMetrics(page);
      const isGrowing = scrollHeight > lastHeight + 50 || allPostsMap.size > lastCount;
      stable = isGrowing ? 0 : stable + 1;
      lastHeight = scrollHeight;
      lastCount = allPostsMap.size;

      console.log(`  Round ${round}: clicks=${queryClicks}/${clicksPerQuery} (+${clicked}), total_unique_posts=${allPostsMap.size}`);

      if (queryClicks >= clicksPerQuery) {
        console.log(`  -> Query budget of ${clicksPerQuery} clicks reached.`);
        break;
      }
      if (stable >= 10) {
        console.log(`  -> Search results end reached.`);
        break;
      }

      const scrollDist = Math.floor(Math.random() * 400) + 950;
      const scrollSleep = Math.floor(Math.random() * 600) + 1200;
      await scrollDown(page, scrollDist);
      await sleep(scrollSleep);
    }
  }

  const allPosts = [...allPostsMap.values()];
  return { posts: allPosts, totalClicks: grandTotalClicks, stopReason: `Completed ${queriesToRun.length} search queries` };
}

// ==================== Main Orchestrator ====================

async function main() {
  const { chromium } = require('playwright');
  const config = await promptMenu();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(process.cwd(), `linkedin-${config.slug}-${stamp}`);

  console.log(`\nActive Mode: ${config.label}`);
  console.log(`Output Prefix: ${base}`);

  fs.mkdirSync(PROFILE, { recursive: true });
  stealth.sanitizeChromeProfile(PROFILE);
  const chromePath = stealth.getChromeExecutable();
  if (chromePath) {
    console.log(`Using real Google Chrome: ${chromePath}`);
  }

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    executablePath: chromePath,
    viewport: { width: 1440, height: 1000 },
    args: stealth.getStealthLaunchArgs()
  });

  const cleanClose = async () => {
    try { await context.close(); } catch (e) {}
    process.exit(0);
  };
  process.on('SIGINT', cleanClose);
  process.on('SIGTERM', cleanClose);

  const page = context.pages()[0] || await context.newPage();
  await stealth.setupStealthPage(page);

  // Phase 2: Autonomous Job Application Pipeline
  if (config.type === 'apply') {
    const { applyToJob } = require('./applier');
    try {
      const result = await applyToJob(page, config.url, config.options);
      console.log(`\n============================================================`);
      console.log(`🎉 Job Application Workflow Finished: ${result.status}`);
      console.log(`Report: ${result.reportPath}`);
      if (result.screenshotPath) console.log(`Screenshot: ${result.screenshotPath}`);
      console.log(`============================================================\n`);
    } catch (err) {
      console.error(`\n❌ Application error: ${err.message}`);
    } finally {
      await cleanClose();
    }
    return;
  }

  let scrapeResult;
  if (config.type === 'feed') {
    scrapeResult = await runFeedScraper(page, config);
  } else if (config.type === 'search' || config.type === 'global') {
    scrapeResult = await runSearchScraper(page, config);
  } else {
    scrapeResult = await runSavedScraper(page, config);
  }

  const { posts, totalClicks, stopReason } = scrapeResult;
  console.log(`\nScraping Finished: ${posts.length} posts collected (${totalClicks} expand clicks; stop=${stopReason})`);

  if (!posts.length) {
    throw new Error('No posts were collected during this run.');
  }

  // 1. Export Raw Scraped Markdown
  const markdown = `# LinkedIn Scraped Posts\n\n` +
    `Mode: ${config.label}\n` +
    `Timestamp: ${new Date().toLocaleString()}\n` +
    `Total Posts: ${posts.length}\n` +
    `Total Expand Clicks: ${totalClicks}\n` +
    `Stop Reason: ${stopReason}\n\n` +
    posts.map((post, index) =>
      `## ${index + 1}. ${post.author}\n\n` +
      `- Age: ${post.age}\n` +
      (post.sourceQuery ? `- Search Query: ${post.sourceQuery}\n` : '') +
      (post.url ? `- Link: ${post.url}\n` : '') +
      `\n${post.text}\n`
    ).join('\n---\n');

  fs.writeFileSync(`${base}.md`, markdown);
  console.log(`📄 Saved posts Markdown: ${base}.md`);

  // 2. Export Visual PDF and Full-page PNG
  try {
    const report = await context.newPage({ viewport: { width: 1200, height: 900 } });
    await report.setContent(`<!doctype html><meta charset=utf-8><style>@page{size:A4;margin:14mm}body{font:14px Arial, sans-serif;max-width:900px;margin:auto}section{border:1px solid #ccd5df;padding:15px;margin:15px 0;border-radius:10px;break-inside:avoid}.text{white-space:pre-wrap}.meta{color:#555;font-size:12px;margin-bottom:8px}</style><h1>LinkedIn Scraped Posts</h1><p class=meta>${posts.length} posts, Mode: ${esc(config.label)}, Date: ${new Date().toLocaleDateString()}</p>${posts.map((post, index) => `<section><h2>${index + 1}. ${esc(post.author)}</h2><div class=meta>${esc(post.age)}${post.sourceQuery ? ` | Query: ${esc(post.sourceQuery)}` : ''}</div><p class=text>${esc(post.text)}</p></section>`).join('')}`);
    await report.pdf({ path: `${base}.pdf`, format: 'A4', printBackground: true });
    await report.screenshot({ path: `${base}.png`, fullPage: false });
    await report.close();
    console.log(`📑 Saved PDF: ${base}.pdf`);
    console.log(`🖼️ Saved Screenshot: ${base}.png`);
  } catch (err) {
    console.warn(`Could not generate PDF/PNG export: ${err.message}`);
  }

  await context.close();

  // 3. Automated Intelligent Post-Processing & Resume Mapping
  console.log('\nRunning intelligent hiring analysis and resume matching...');
  const analysisResults = analyzePosts(posts);
  const analysisReport = generateAnalysisReport(analysisResults, config.label);
  const analysisPath = `${base}-hiring-analysis.md`;
  fs.writeFileSync(analysisPath, analysisReport);
  console.log(`🎯 Saved Hiring Analysis Report: ${analysisPath}`);

  // 4. Print Summary Table in Console
  printConsoleSummaryTable(analysisResults);

  console.log(`\n🎉 ALL DONE! Everything exported and analyzed successfully.`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(`\n❌ FAILED\n${error.stack || error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  parsePeriod,
  parseAge,
  parseSelection,
  promptMenu,
  SEARCH_QUERIES,
  GLOBAL_PM_QUERIES,
  TARGET_COUNTRIES,
  buildCountryQueries
};
