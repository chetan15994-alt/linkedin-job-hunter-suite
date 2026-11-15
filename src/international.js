/**
 * Global & Remote PM Job Hunter Module (15 Target Countries)
 * Targets high-yield Product Management openings offering:
 * 1. Visa Sponsorship & Relocation Support
 * 2. Remote Work Models (Global & Regional)
 */

const TARGET_COUNTRIES = [
  { id: 'US', name: 'United States', region: 'North America', keywords: ['United States', 'USA', 'US', 'San Francisco', 'New York', 'Seattle', 'Austin'] },
  { id: 'UK', name: 'United Kingdom', region: 'UK & Ireland', keywords: ['United Kingdom', 'UK', 'London', 'Manchester', 'Cambridge'] },
  { id: 'CA', name: 'Canada', region: 'North America', keywords: ['Canada', 'Toronto', 'Vancouver', 'Montreal', 'Ottawa'] },
  { id: 'DE', name: 'Germany', region: 'DACH & Central Europe', keywords: ['Germany', 'Deutschland', 'Berlin', 'Munich', 'Frankfurt', 'Hamburg'] },
  { id: 'SG', name: 'Singapore', region: 'Asia-Pacific', keywords: ['Singapore', 'SG'] },
  { id: 'FR', name: 'France', region: 'Western Europe', keywords: ['France', 'Paris', 'Lyon'] },
  { id: 'ES', name: 'Spain', region: 'Southern Europe', keywords: ['Spain', 'Espana', 'Madrid', 'Barcelona', 'Valencia'] },
  { id: 'PL', name: 'Poland', region: 'Central Europe', keywords: ['Poland', 'Polska', 'Warsaw', 'Krakow', 'Wroclaw'] },
  { id: 'AU', name: 'Australia', region: 'Asia-Pacific', keywords: ['Australia', 'Sydney', 'Melbourne', 'Brisbane'] },
  { id: 'NL', name: 'Netherlands', region: 'DACH & Central Europe', keywords: ['Netherlands', 'Amsterdam', 'Rotterdam', 'Utrecht', 'Holland'] },
  { id: 'IE', name: 'Ireland', region: 'UK & Ireland', keywords: ['Ireland', 'Dublin', 'Cork'] },
  { id: 'AE', name: 'UAE (Dubai / Abu Dhabi)', region: 'Middle East', keywords: ['UAE', 'United Arab Emirates', 'Dubai', 'Abu Dhabi'] },
  { id: 'CH', name: 'Switzerland', region: 'DACH & Central Europe', keywords: ['Switzerland', 'Schweiz', 'Zurich', 'Geneva', 'Basel'] },
  { id: 'SE', name: 'Sweden', region: 'Northern Europe', keywords: ['Sweden', 'Sverige', 'Stockholm', 'Gothenburg'] },
  { id: 'SA', name: 'Saudi Arabia', region: 'Middle East', keywords: ['Saudi Arabia', 'KSA', 'Riyadh', 'Jeddah', 'NEOM'] }
];

/**
 * 12 Curated Regional & Global Search Queries
 * Intelligently clusters the 15 countries to prevent LinkedIn bot rate-limits
 * while guaranteeing 100% coverage across Visa Sponsorship and Remote.
 */
const GLOBAL_PM_QUERIES = [
  // 1. North America (US & Canada) - Visa Sponsorship
  {
    id: 1,
    title: "US & Canada: Product Manager (Visa Sponsorship & Relocation)",
    region: "North America",
    focus: "Visa Sponsorship",
    targetResume: "Chetan_CV_Technical_PM_V4.pdf",
    query: 'hiring "Product Manager" ("United States" OR "Canada" OR "USA") "visa sponsorship" email'
  },
  // 2. North America (US & Canada) - Remote
  {
    id: 2,
    title: "US & Canada: Remote Product Manager",
    region: "North America",
    focus: "Remote",
    targetResume: "Chetan_CV_B2BSaaS_PM_V4.pdf",
    query: 'hiring "Product Manager" ("US" OR "Canada") "remote" email'
  },
  // 3. UK & Ireland - Visa Sponsorship & Relocation
  {
    id: 3,
    title: "UK & Ireland: Product Manager (Visa Sponsorship & Relocation)",
    region: "UK & Ireland",
    focus: "Visa Sponsorship",
    targetResume: "Chetan_CV_Agentic_PM_V4.pdf",
    query: 'hiring "Product Manager" ("United Kingdom" OR "UK" OR "London" OR "Ireland" OR "Dublin") ("visa sponsorship" OR "relocation") email'
  },
  // 4. UK & Ireland - Remote
  {
    id: 4,
    title: "UK & Ireland: Remote Product Manager",
    region: "UK & Ireland",
    focus: "Remote",
    targetResume: "Chetan_CV_Growth_PM_V4.pdf",
    query: 'hiring "Product Manager" ("UK" OR "Ireland") "remote" email'
  },
  // 5. Germany, Netherlands & Central Europe - Visa & Relocation
  {
    id: 5,
    title: "Germany, Netherlands, Switzerland & Poland: Visa & Relocation PM",
    region: "DACH & Central Europe",
    focus: "Visa Sponsorship",
    targetResume: "Chetan_CV_Agentic_PM_V4.pdf",
    query: 'hiring "Product Manager" ("Germany" OR "Netherlands" OR "Switzerland" OR "Poland") ("visa" OR "relocation") email'
  },
  // 6. Germany, Netherlands & Central Europe - Remote
  {
    id: 6,
    title: "Germany & Central Europe: Remote Product Manager",
    region: "DACH & Central Europe",
    focus: "Remote",
    targetResume: "Chetan_CV_B2BSaaS_PM_V4.pdf",
    query: 'hiring "Product Manager" ("Germany" OR "Netherlands" OR "Switzerland" OR "Poland") "remote" email'
  },
  // 7. France, Spain & Sweden - Visa & Remote
  {
    id: 7,
    title: "France, Spain & Sweden: Product Manager (Visa or Remote)",
    region: "Western & Northern Europe",
    focus: "Visa Sponsorship & Remote",
    targetResume: "Chetan_CV_Growth_PM_V4.pdf",
    query: 'hiring "Product Manager" ("France" OR "Spain" OR "Sweden") ("visa" OR "relocation" OR "remote") email'
  },
  // 8. UAE & Saudi Arabia - Relocation & Visa Hub
  {
    id: 8,
    title: "UAE (Dubai) & Saudi Arabia: PM Relocation & Visa Roles",
    region: "Middle East",
    focus: "Visa Sponsorship",
    targetResume: "Chetan_CV_B2BSaaS_PM_V4.pdf",
    query: 'hiring "Product Manager" ("UAE" OR "Dubai" OR "Saudi Arabia" OR "Riyadh") ("relocation" OR "visa") email'
  },
  // 9. UAE & Saudi Arabia - Remote PM
  {
    id: 9,
    title: "UAE & Saudi Arabia: Remote Product Manager",
    region: "Middle East",
    focus: "Remote",
    targetResume: "Chetan_CV_Agentic_PM_V4.pdf",
    query: 'hiring "Product Manager" ("Dubai" OR "UAE" OR "Saudi Arabia") "remote" email'
  },
  // 10. Singapore & Australia - Visa Sponsorship & Relocation
  {
    id: 10,
    title: "Singapore & Australia: Product Manager (Visa & Relocation)",
    region: "Asia-Pacific",
    focus: "Visa Sponsorship",
    targetResume: "Chetan_CV_Agentic_PM_V4.pdf",
    query: 'hiring "Product Manager" ("Singapore" OR "Australia" OR "Sydney") ("visa" OR "relocation") email'
  },
  // 11. Singapore & Australia - Remote PM
  {
    id: 11,
    title: "Singapore & Australia: Remote Product Manager",
    region: "Asia-Pacific",
    focus: "Remote",
    targetResume: "Chetan_CV_Technical_PM_V4.pdf",
    query: 'hiring "Product Manager" ("Singapore" OR "Australia") "remote" email'
  },
  // 12. Global & Cross-Border Remote PM (Worldwide)
  {
    id: 12,
    title: "Worldwide Global Remote Product Manager",
    region: "Global Remote",
    focus: "Global Remote",
    targetResume: "Chetan_CV_Growth_PM_V4.pdf",
    query: 'hiring "Product Manager" ("worldwide" OR "anywhere" OR "global remote") email'
  }
];

/**
 * Builds country-specific queries if user wants to drill down into a single country.
 */
function buildCountryQueries(countryIdentifier) {
  const cLower = countryIdentifier.toLowerCase().trim();
  const found = TARGET_COUNTRIES.find(c =>
    c.id.toLowerCase() === cLower ||
    c.name.toLowerCase().includes(cLower) ||
    c.keywords.some(k => k.toLowerCase() === cLower)
  );

  if (!found) return null;

  const kw = found.keywords.slice(0, 3).map(k => `"${k}"`).join(' OR ');
  return [
    {
      id: 1,
      title: `${found.name}: Product Manager (Visa Sponsorship & Relocation)`,
      region: found.region,
      focus: "Visa Sponsorship",
      targetResume: "Chetan_CV_Agentic_PM_V4.pdf",
      query: `hiring "Product Manager" (${kw}) ("visa" OR "relocation") email`
    },
    {
      id: 2,
      title: `${found.name}: Remote Product Manager`,
      region: found.region,
      focus: "Remote",
      targetResume: "Chetan_CV_B2BSaaS_PM_V4.pdf",
      query: `hiring "Product Manager" (${kw}) "remote" email`
    },
    {
      id: 3,
      title: `${found.name}: Direct PM Hiring with Recruiter Email`,
      region: found.region,
      focus: "General PM",
      targetResume: "Chetan_CV_Growth_PM_V4.pdf",
      query: `hiring "Product Manager" (${kw}) email`
    }
  ];
}

/**
 * Detects which of the 15 countries is mentioned in the post text.
 */
function detectCountry(text) {
  const lower = text.toLowerCase();
  const matchedCountries = [];

  for (const country of TARGET_COUNTRIES) {
    for (const kw of country.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lower)) {
        matchedCountries.push(country.name);
        break;
      }
    }
  }

  if (matchedCountries.length > 0) {
    return matchedCountries.join(', ');
  }

  if (/\b(?:worldwide|global|anywhere|cross-border)\b/i.test(lower)) {
    return 'Global Remote';
  }

  return 'International / Unspecified';
}

/**
 * Detects whether the post offers Visa Sponsorship, Relocation, or Remote.
 */
function detectWorkArrangement(text) {
  const lower = text.toLowerCase();
  const features = [];

  const hasVisa = /\b(?:visa sponsorship|visa sponsor|visa sponsored|work permit|sponsorship available|relocation|relocate|relocation assistance|relocation support)\b/i.test(lower);
  const isRemote = /\b(?:remote|work from anywhere|wfh|anywhere in the world|distributed team|100% remote|remote first)\b/i.test(lower);
  const isHybrid = /\b(?:hybrid|flexible)\b/i.test(lower);

  if (hasVisa) features.push('Visa Sponsored / Relocation');
  if (isRemote) features.push('Remote');
  if (!isRemote && isHybrid) features.push('Hybrid');
  if (features.length === 0) features.push('On-site / Flexible');

  return features.join(' + ');
}

module.exports = {
  TARGET_COUNTRIES,
  GLOBAL_PM_QUERIES,
  buildCountryQueries,
  detectCountry,
  detectWorkArrangement
};
