#!/usr/bin/env node
/**
 * HWP SEO Audit runner — 7 audit areas × all sitemap pages.
 * Fetches {baseUrl}/sitemap.xml, extracts every <loc>, audits each page.
 * Falls back to auditing only "/" with a BLOCKER when sitemap is absent.
 * Usage: node runner.mjs <base-url> <site-slug>
 * Output: full markdown report on stdout, exit 0 (even with failures).
 *         exit 1 only on hard fetch error against the root URL.
 * Requires: Node 20+ (built-in fetch).
 */

const [,, baseUrl = 'http://localhost:3000', slug = 'site-demo'] = process.argv;
const today = new Date().toISOString().slice(0, 10);
const MAX_PAGES = 20;

// ─── Fetch helper ─────────────────────────────────────────────────────────────
async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ─── Audit 1: Semantic HTML ───────────────────────────────────────────────────
function auditSemantic(html, add) {
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1s === 0) add('blocker', 'semantic', 'No H1 element found on page');
  else if (h1s > 1) add('blocker', 'semantic', `${h1s} H1 elements found — must be exactly 1`);

  const levels = [...html.matchAll(/<(h[1-6])[\s>]/gi)].map(m => parseInt(m[1][1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1)
      add('blocker', 'semantic', `Heading level skip: h${levels[i - 1]} → h${levels[i]}`);
  }

  [...html.matchAll(/<nav([^>]*)>/gi)].forEach((m, i) => {
    if (!m[1].includes('aria-label'))
      add('major', 'semantic', `nav #${i + 1} missing aria-label attribute`);
  });

  [...html.matchAll(/<section([^>]*)>/gi)].forEach((m, i) => {
    if (!m[1].includes('aria-labelledby') && !m[1].includes('aria-label'))
      add('major', 'semantic', `section #${i + 1} missing aria-labelledby or aria-label`);
  });

  const footerM = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  if (footerM && !/<nav[\s>]/i.test(footerM[1]))
    add('major', 'semantic', 'Footer links not wrapped in <nav aria-label="Footer navigation">');

  const h1Raw = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  const h1Text = h1Raw.replace(/<[^>]+>/g, '').trim().toLowerCase();
  if (/^(bienvenue|welcome|bienvenido|willkommen|benvenuto)\b/.test(h1Text))
    add('major', 'semantic', `H1 starts with greeting word — should lead with establishment name: "${h1Text.slice(0, 60)}"`);
}

// ─── Audit 2: Meta tags ───────────────────────────────────────────────────────
function auditMeta(html, add) {
  const titleM = html.match(/<title>([^<]+)<\/title>/i);
  if (!titleM) {
    add('blocker', 'meta', 'No <title> element found');
  } else {
    const t = titleM[1];
    if (t.length > 60)
      add('major', 'meta', `Title too long: ${t.length} chars (max 60) — "${t}"`);
    if (!t.includes(' — ') && !t.includes(' - '))
      add('major', 'meta', `Title missing em dash separator: "${t}" — expected format: {Name} — {Type}★ en {City}`);
    const locationWords = ['calvisson','gard','camargue','nîmes','montpellier','roses','costa brava','cuenca','alicante','girona'];
    if (!locationWords.some(w => t.toLowerCase().includes(w)))
      add('major', 'meta', `Title missing location keyword: "${t}"`);
  }

  const descM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
             || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  if (!descM) {
    add('blocker', 'meta', 'No meta description found');
  } else {
    const d = descM[1];
    if (d.length > 155) add('major', 'meta', `Meta description too long: ${d.length} chars (max 155)`);
    if (d.length < 80)  add('minor', 'meta', `Meta description short: ${d.length} chars (aim for 120–155 with CTA)`);
  }

  if (!html.includes('rel="canonical"') && !html.includes("rel='canonical'"))
    add('major', 'meta', 'Missing <link rel="canonical">');

  for (const tag of ['og:title', 'og:description', 'og:image', 'og:type', 'og:url']) {
    if (!html.includes(`property="${tag}"`) && !html.includes(`property='${tag}'`))
      add('major', 'meta', `Missing <meta property="${tag}">`);
  }

  const htmlAttrs = (html.match(/<html([^>]*)>/i) || [])[1] || '';
  if (!htmlAttrs.includes('lang='))
    add('blocker', 'meta', '<html> tag missing lang attribute (e.g. lang="fr")');
}

// ─── Audit 3: Images ─────────────────────────────────────────────────────────
function auditImages(html, add) {
  const imgs = [...html.matchAll(/<img([^>]+)>/gi)].map(m => m[1]);

  imgs.forEach((attrs, i) => {
    const n       = i + 1;
    const src     = (attrs.match(/src=["']([^"']+)["']/) || [])[1] || '';
    const file    = src.split('/').pop().split('?')[0];
    const altM    = attrs.match(/alt=["']([^"']*)["']/);
    const hasW    = attrs.includes('width=');
    const hasH    = attrs.includes('height=');
    const loading = (attrs.match(/loading=["']([^"']+)["']/) || [])[1] || '';
    const hasFP   = /fetchpriority/i.test(attrs);
    const isHero  = i === 0;

    if (!altM) {
      add('blocker', 'images', `img #${n} (${file}): missing alt attribute`);
    } else {
      const v = altM[1].trim();
      if (v === '') add('major', 'images', `img #${n} (${file}): empty alt — add aria-hidden="true" if decorative`);
      if (['image','photo','img','picture','foto'].includes(v.toLowerCase()))
        add('major', 'images', `img #${n}: generic alt "${v}" — use descriptive text`);
    }

    if (!hasW) add('major', 'images', `img #${n} (${file}): missing width attribute — causes CLS`);
    if (!hasH) add('major', 'images', `img #${n} (${file}): missing height attribute — causes CLS`);

    if (isHero && loading !== 'lazy') {
      if (loading !== 'eager' && !hasFP) add('blocker', 'images', `Hero img (${file}): missing loading="eager" — LCP blocker (use Next.js <Image priority>)`);
      if (!hasFP)                        add('major',   'images', `Hero img (${file}): missing fetchpriority="high"`);
    } else if (!isHero) {
      if (loading !== 'lazy')  add('major', 'images', `img #${n} (${file}): below-fold image should have loading="lazy"`);
    }

    const extM = file.match(/\.(\w+)$/);
    if (extM) {
      const ext = extM[1].toLowerCase();
      if (ext === 'gif')                    add('blocker', 'images', `img #${n}: GIF — use <video muted loop playsinline> or CSS animation`);
      else if (ext === 'png')               add('major',   'images', `img #${n} (${file}): PNG for photo — convert to WebP`);
      else if (['jpg','jpeg'].includes(ext)) add('minor',  'images', `img #${n} (${file}): JPEG — convert to WebP for 30–50% size reduction`);
    }
  });

  const headEnd     = html.toLowerCase().indexOf('</head>');
  const headContent = headEnd > 0 ? html.slice(0, headEnd) : '';
  const preloadInHead = /rel=["']preload["']/.test(headContent) && /as=["']image["']/.test(headContent);
  const preloadAny    = /rel=["']preload["']/.test(html)         && /as=["']image["']/.test(html);

  const hasNonLazyImg = imgs.some(a => !(/loading=["']lazy["']/i.test(a)));
  if (imgs.length > 0 && hasNonLazyImg && !preloadAny)
    add('major', 'images', 'No <link rel="preload" as="image"> found — hero LCP unoptimised');
  else if (imgs.length > 0 && hasNonLazyImg && !preloadInHead)
    add('major', 'images', '<link rel="preload" as="image"> found but outside <head> — move to <head>');
}

// ─── Audit 4: Structured data ─────────────────────────────────────────────────
function auditStructuredData(html, add, { isHomePage = false } = {}) {
  const rawBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemas = rawBlocks.map(m => { try { return JSON.parse(m[1].trim()); } catch { return null; } }).filter(Boolean);

  if (schemas.length === 0) {
    add('blocker', 'structured-data', 'No JSON-LD schemas found — entire structured data layer missing');
    return;
  }

  const headEnd  = html.toLowerCase().indexOf('</head>');
  const bodyPart = headEnd > 0 ? html.slice(html.toLowerCase().indexOf('<body') || headEnd) : '';
  const inBody   = (bodyPart.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi) || []).length;
  if (inBody > 0) add('major', 'structured-data', `${inBody} JSON-LD block(s) in <body> — must be in <head>`);

  const allTypes = schemas.flatMap(s => s['@graph'] ? s['@graph'].map(x => x['@type']) : [s['@type']]).filter(Boolean);

  if (isHomePage && !allTypes.some(t => ['Campground', 'Hotel', 'LodgingBusiness'].includes(t)))
    add('blocker', 'structured-data', 'Homepage missing Campground or Hotel schema');
  if (!allTypes.includes('Organization'))
    add('major', 'structured-data', 'Missing Organization schema (required on all pages)');
  if (!allTypes.includes('FAQPage'))
    add(isHomePage ? 'major' : 'minor', 'structured-data', 'Missing FAQPage schema (improves LLM citability)');
  if (!allTypes.includes('BreadcrumbList'))
    add('minor', 'structured-data', 'Missing BreadcrumbList schema');

  const rawJson = JSON.stringify(schemas);
  const placeholders = [...new Set((rawJson.match(/\{\{[^}]+\}\}/g) || []))];
  if (placeholders.length > 0)
    add('blocker', 'structured-data', `Unfilled template placeholders: ${placeholders.slice(0, 5).join(', ')}`);

  const emptyVals = [...rawJson.matchAll(/"[^"]+"\s*:\s*(""|null|\[\])/g)].length;
  if (emptyVals > 0)
    add('major', 'structured-data', `${emptyVals} empty or null field value(s) in schemas — omit fields with no data`);
}

// ─── Audit 5: Local SEO ───────────────────────────────────────────────────────
function auditLocalSeo(html, add) {
  const LOC = ['calvisson','gard','camargue','nîmes','montpellier','roses','costa brava','cuenca','alicante','girona'];

  const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '';
  if (title && !LOC.some(w => title.toLowerCase().includes(w)))
    add('major', 'local-seo', `Location keyword missing from <title>: "${title}"`);

  const h1Raw = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  const h1    = h1Raw.replace(/<[^>]+>/g, '').trim();
  if (h1 && !LOC.some(w => h1.toLowerCase().includes(w)))
    add('major', 'local-seo', `Location keyword missing from <h1>: "${h1.slice(0, 60)}"`);

  const schemas = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
  const hasGeo = schemas.some(s => {
    const items = s['@graph'] || [s];
    return items.some(item => item.geo && (item.geo.latitude !== undefined || item.geo['@type'] === 'GeoCoordinates'));
  });
  if (!hasGeo)
    add('blocker', 'local-seo', 'GeoCoordinates absent from structured data — required for maps and local LLM answers');

  const pageText = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ');
  if (!/\+?\d[\d\s.()-]{7,}\d/.test(pageText))
    add('major', 'local-seo', 'No phone number found on page — NAP incomplete');
}

// ─── Audit 6: Performance (Core Web Vitals signals) ───────────────────────────
function auditPerformance(html, add) {
  const headEnd     = html.toLowerCase().indexOf('</head>');
  const headContent = headEnd > 0 ? html.slice(0, headEnd) : '';

  const preloadInHead = /rel=["']preload["']/.test(headContent) && /as=["']image["']/.test(headContent);
  const preloadAny    = /rel=["']preload["']/.test(html)         && /as=["']image["']/.test(html);

  const firstImgAttrs = (html.match(/<img([^>]+)>/) || [])[1] || '';
  const firstImgIsLazy = /loading=["']lazy["']/i.test(firstImgAttrs);
  if (firstImgAttrs && !firstImgIsLazy) {
    if (!preloadAny)
      add('major', 'performance', 'No <link rel="preload" as="image"> — hero LCP element not preloaded');
    else if (!preloadInHead)
      add('major', 'performance', '<link rel="preload" as="image"> outside <head> — preload must be in <head>');

    if (!/loading=["']eager["']/i.test(firstImgAttrs) && !/fetchpriority/i.test(firstImgAttrs))
      add('blocker', 'performance', 'Hero <img> missing loading="eager" — browser deprioritises LCP element');
    if (!/fetchpriority/i.test(firstImgAttrs))
      add('major', 'performance', 'Hero <img> missing fetchpriority="high"');
  }

  const allImgAttrs = [...html.matchAll(/<img([^>]+)>/gi)].map(m => m[1]);
  const missingDims = allImgAttrs.filter(a => !a.includes('width=') || !a.includes('height=')).length;
  if (missingDims > 0)
    add('major', 'performance', `${missingDims} img(s) missing explicit width and/or height — layout shifts cause CLS`);

  const blockingScripts = [...headContent.matchAll(/<script[^>]+src=[^>]+>/gi)]
    .filter(m => !/(async|defer|type=["']module["']|nomodule)/i.test(m[0]));
  if (blockingScripts.length > 0)
    add('major', 'performance', `${blockingScripts.length} render-blocking <script src> in <head> (no async/defer/type=module)`);

  const divOnClicks = (html.match(/<div[^>]+onClick/g) || []).length;
  if (divOnClicks > 0)
    add('major', 'performance', `${divOnClicks} <div onClick> found — replace with <button type="button"> for INP`);
}

// ─── Audit 7: GEO / LLM optimisation ─────────────────────────────────────────
function auditGeoLlm(html, add) {
  const schemaCount = (html.match(/application\/ld\+json/g) || []).length;
  if (schemaCount === 0)
    add('blocker', 'geo-llm', 'No JSON-LD in SSR HTML — LLM crawlers (Googlebot, GPTBot) cannot index structured data');

  if (!html.includes('FAQPage'))
    add('major', 'geo-llm', 'FAQPage schema absent — LLMs cannot cite the site for Q&A searches');

  if (!html.includes('sameAs'))
    add('major', 'geo-llm', 'sameAs absent from Organization/Campground schema — no authority signal for LLMs');

  const mainM = html.match(/<main[^>]*>([\s\S]*)/i);
  if (mainM) {
    const firstP = mainM[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (firstP) {
      const pText = firstP[1].replace(/<[^>]+>/g, '').toLowerCase();
      if (!/camping|hôtel|hotel|balneario|resort|auberge|parador/.test(pText))
        add('major', 'geo-llm', 'First <p> in <main> missing establishment type keyword — LLMs cannot classify the entity');
    } else {
      add('major', 'geo-llm', 'No <p> element found in <main> — no citable first paragraph for LLMs');
    }
  }

  if (!html.includes('additionalProperty'))
    add('minor', 'geo-llm', 'additionalProperty absent from JSON-LD — proximity data unavailable for "near X" LLM queries');

  if (!html.includes('dateModified'))
    add('minor', 'geo-llm', 'dateModified absent from JSON-LD — content freshness signal missing for LLMs');
}

// ─── Resolve URLs to audit ────────────────────────────────────────────────────
const siteWideFindings = [];
let urlsToAudit = [];

try {
  const sitemapXml = await fetchText(`${baseUrl}/sitemap.xml`);

  if (sitemapXml.includes('<sitemapindex')) {
    siteWideFindings.push({
      sev: 'major', area: 'meta',
      msg: 'sitemap.xml is a sitemap index — nested sitemaps are not followed; audit falls back to / only',
    });
    urlsToAudit = [`${baseUrl}/`];
  } else {
    const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
    if (locs.length === 0) {
      siteWideFindings.push({
        sev: 'blocker', area: 'meta',
        msg: 'sitemap.xml present but contains no <loc> entries',
      });
      urlsToAudit = [`${baseUrl}/`];
    } else {
      // Map production sitemap URLs to the local dev server by reusing the path
      urlsToAudit = locs.slice(0, MAX_PAGES).map(rawUrl => {
        try {
          const { pathname } = new URL(rawUrl);
          return `${baseUrl}${pathname}`;
        } catch {
          return rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl}`;
        }
      });
      if (locs.length > MAX_PAGES) {
        siteWideFindings.push({
          sev: 'minor', area: 'meta',
          msg: `Sitemap has ${locs.length} URLs — audit limited to first ${MAX_PAGES}`,
        });
      }
    }
  }
} catch {
  siteWideFindings.push({
    sev: 'blocker', area: 'meta',
    msg: 'Missing sitemap.xml — add /sitemap.xml (use Next.js built-in sitemap route or next-sitemap)',
  });
  urlsToAudit = [`${baseUrl}/`];
}

// ─── Audit each page ──────────────────────────────────────────────────────────
const pages = [];

for (const pageUrl of urlsToAudit) {
  const relPath = pageUrl.replace(baseUrl, '') || '/';
  const isHomePage = relPath === '/' || relPath === '';
  const findings = [];
  const add = (sev, area, msg) => findings.push({ sev, area, msg });

  let html;
  try {
    html = await fetchText(pageUrl);
  } catch (e) {
    findings.push({ sev: 'blocker', area: 'meta', msg: `Page fetch failed: ${e.message}` });
    pages.push({ url: pageUrl, relPath, findings });
    continue;
  }

  auditSemantic(html, add);
  auditMeta(html, add);
  auditImages(html, add);
  auditStructuredData(html, add, { isHomePage });
  auditLocalSeo(html, add);
  auditPerformance(html, add);
  auditGeoLlm(html, add);

  pages.push({ url: pageUrl, relPath, findings });
}

// ─── Aggregate global findings ────────────────────────────────────────────────
const AREAS = ['semantic', 'meta', 'images', 'structured-data', 'local-seo', 'performance', 'geo-llm'];
const LABELS = {
  'semantic':        'Semantic HTML',
  'meta':            'Meta tags',
  'images':          'Images',
  'structured-data': 'Structured data',
  'local-seo':       'Local SEO',
  'performance':     'Performance (CWV)',
  'geo-llm':         'GEO / LLM',
};

// All findings across every page + site-wide
const allFindings = [
  ...siteWideFindings,
  ...pages.flatMap(p => p.findings.map(f => ({ ...f, relPath: p.relPath }))),
];

const gBlockers = allFindings.filter(f => f.sev === 'blocker');
const gMajors   = allFindings.filter(f => f.sev === 'major');
const gMinors   = allFindings.filter(f => f.sev === 'minor');
const overall   = gBlockers.length > 0 ? '🔴 Red' : gMajors.length > 0 ? '🟡 Yellow' : '🟢 Green';

// ─── Build report ─────────────────────────────────────────────────────────────
const fmtRow = (f, i) => `| ${i + 1} | ${LABELS[f.area] || f.area} | ${f.msg} |`;

let md = `# SEO Audit — ${slug}\n\n`;
md += `**Date:** ${today} | **Base URL:** ${baseUrl} | **URLs audited:** ${pages.length} | **Overall:** ${overall}\n\n`;
md += `---\n\n`;

// ── Site-wide findings (sitemap, crawler-level)
if (siteWideFindings.length > 0) {
  md += `## Site-wide findings\n\n`;
  md += `| # | Severity | Finding |\n|---|---|---|\n`;
  siteWideFindings.forEach((f, i) => {
    const badge = f.sev === 'blocker' ? '🔴 BLOCKER' : f.sev === 'major' ? '🟡 MAJOR' : '🔵 MINOR';
    md += `| ${i + 1} | ${badge} | ${f.msg} |\n`;
  });
  md += '\n---\n\n';
}

// ── Per-page sections
for (const page of pages) {
  const pBlockers = page.findings.filter(f => f.sev === 'blocker');
  const pMajors   = page.findings.filter(f => f.sev === 'major');
  const pMinors   = page.findings.filter(f => f.sev === 'minor');
  const pVerdict  = pBlockers.length > 0 ? '🔴 Red' : pMajors.length > 0 ? '🟡 Yellow' : '🟢 Green';

  md += `## \`${page.relPath}\` — ${pVerdict}\n\n`;

  md += `### BLOCKERS (${pBlockers.length})\n\n`;
  if (pBlockers.length === 0) md += '_None_ ✓\n\n';
  else { md += '| # | Area | Finding |\n|---|---|---|\n'; pBlockers.forEach((f,i) => { md += fmtRow(f,i)+'\n'; }); md += '\n'; }

  md += `### MAJORS (${pMajors.length})\n\n`;
  if (pMajors.length === 0) md += '_None_ ✓\n\n';
  else { md += '| # | Area | Finding |\n|---|---|---|\n'; pMajors.forEach((f,i) => { md += fmtRow(f,i)+'\n'; }); md += '\n'; }

  md += `### MINORS (${pMinors.length})\n\n`;
  if (pMinors.length === 0) md += '_None_ ✓\n\n';
  else { md += '| # | Area | Finding |\n|---|---|---|\n'; pMinors.forEach((f,i) => { md += fmtRow(f,i)+'\n'; }); md += '\n'; }

  md += `---\n\n`;
}

// ── Global score summary
md += `## Global score summary\n\n`;
md += '| Area | Blockers | Majors | Minors | Verdict |\n|---|---|---|---|-|\n';
AREAS.forEach(area => {
  const b  = allFindings.filter(f => f.area === area && f.sev === 'blocker').length;
  const m  = allFindings.filter(f => f.area === area && f.sev === 'major').length;
  const mn = allFindings.filter(f => f.area === area && f.sev === 'minor').length;
  const v  = b > 0 ? '🔴 Red' : m > 0 ? '🟡 Yellow' : '🟢 Green';
  md += `| ${LABELS[area]} | ${b} | ${m} | ${mn} | ${v} |\n`;
});
md += `| **TOTAL** | **${gBlockers.length}** | **${gMajors.length}** | **${gMinors.length}** | ${overall} |\n\n`;

md += `### Fix priority order (top 10 across all pages)\n\n`;
[...gBlockers, ...gMajors].slice(0, 10).forEach((f, i) => {
  const loc = f.relPath ? ` (\`${f.relPath}\`)` : '';
  md += `${i + 1}. **[${f.sev.toUpperCase()}]** \`${LABELS[f.area] || f.area}\`${loc} — ${f.msg}\n`;
});
md += '\n';

md += `---\n\n_Generated by \`/seo-audit\` skill — HWP platform_\n`;

process.stdout.write(md);
