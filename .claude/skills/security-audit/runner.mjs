#!/usr/bin/env node
/**
 * Security audit runner — network-based checks only.
 * Handles: HTTP headers, cookie pre-consent, pnpm dependency audit.
 * Grep-based code audits (inputs, secrets, RGPD, Next.js) run from SKILL.md directly.
 *
 * Usage: node runner.mjs <BASE_URL> <SLUG>
 * Exit 0: success (findings may exist — check the report).
 * Exit 1: hard failure (root URL unreachable, runner cannot produce a valid report).
 */

const [, , BASE_URL, SLUG] = process.argv;

if (!BASE_URL || !SLUG) {
  console.error('Usage: node runner.mjs <BASE_URL> <SLUG>');
  process.exit(1);
}

// ─── Finding collector ────────────────────────────────────────────────────────

const findings = { headers: [], cookies: [], dependencies: [] };

// severity: 'blocker' | 'major' | 'minor' | 'skip'
// 'skip' = intentionally not checked in this environment; not counted in score.
function add(area, severity, message) {
  findings[area].push({ severity, message });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWithMeta(url, options = {}) {
  try {
    const res = await fetch(url, { redirect: 'manual', ...options });
    return res;
  } catch (err) {
    return null;
  }
}

function verdict(areaFindings) {
  if (areaFindings.some(f => f.severity === 'blocker')) return '🔴 Red';
  if (areaFindings.some(f => f.severity === 'major'))   return '🟡 Yellow';
  return '🟢 Green';
}

// ─── Audit 1: HTTP headers ────────────────────────────────────────────────────

async function auditHeaders(baseUrl) {
  const res = await fetchWithMeta(baseUrl);
  if (!res) {
    add('headers', 'blocker', `Cannot reach ${baseUrl} — server may be down`);
    return;
  }

  const h = name => res.headers.get(name) || '';
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl);

  // Strict-Transport-Security
  // Skipped on localhost: HSTS is meaningless over plain HTTP and Vercel injects it in production.
  const hsts = h('strict-transport-security');
  if (isLocalhost) {
    add('headers', 'skip', '`Strict-Transport-Security` — SKIP on localhost (Vercel injects in production; verify post-deploy)');
  } else if (!hsts) {
    add('headers', 'blocker', '`Strict-Transport-Security` header missing');
  } else {
    const maxAge = parseInt((hsts.match(/max-age=(\d+)/i) || [])[1] || '0', 10);
    if (maxAge < 31536000) add('headers', 'major', `\`Strict-Transport-Security\` max-age=${maxAge} — must be ≥ 31536000 (1 year)`);
  }

  // Content-Security-Policy
  const csp = h('content-security-policy');
  if (!csp) {
    add('headers', 'blocker', '`Content-Security-Policy` header missing');
  } else {
    if (!csp.includes('default-src'))   add('headers', 'blocker', 'CSP missing `default-src` directive');
    if (!csp.includes('script-src'))    add('headers', 'major',   'CSP missing `script-src` directive');
    if (!csp.includes('frame-ancestors') && !h('x-frame-options'))
                                        add('headers', 'major',   'CSP missing `frame-ancestors` and no `X-Frame-Options` — clickjacking risk');
    if (csp.includes('unsafe-eval'))    add('headers', 'major',   'CSP contains `unsafe-eval` — allows arbitrary JS execution');
    if (!csp.includes('nonce-') && !csp.includes('strict-dynamic'))
                                        add('headers', 'minor',   'CSP `script-src` uses no nonce or strict-dynamic — consider tightening');
  }

  // X-Content-Type-Options
  const xcto = h('x-content-type-options').toLowerCase();
  if (!xcto) {
    add('headers', 'blocker', '`X-Content-Type-Options` header missing');
  } else if (xcto !== 'nosniff') {
    add('headers', 'major', `\`X-Content-Type-Options: ${xcto}\` — expected \`nosniff\``);
  }

  // X-Frame-Options (only flag if CSP frame-ancestors also absent)
  const xfo = h('x-frame-options');
  const cspHasFrameAncestors = csp.includes('frame-ancestors');
  if (!xfo && !cspHasFrameAncestors) {
    add('headers', 'major', '`X-Frame-Options` missing and CSP has no `frame-ancestors` — clickjacking risk');
  }

  // Referrer-Policy
  const rp = h('referrer-policy').toLowerCase();
  if (!rp) {
    add('headers', 'major', '`Referrer-Policy` header missing — URL may leak to third parties');
  } else if (['unsafe-url', 'no-referrer-when-downgrade'].includes(rp)) {
    add('headers', 'major', `\`Referrer-Policy: ${rp}\` leaks the full URL — use \`strict-origin-when-cross-origin\``);
  }

  // Permissions-Policy
  const pp = h('permissions-policy');
  if (!pp) {
    add('headers', 'major', '`Permissions-Policy` header missing — camera / microphone / geolocation unrestricted');
  } else {
    if (!pp.includes('camera=()'))      add('headers', 'minor', '`Permissions-Policy` does not restrict `camera`');
    if (!pp.includes('microphone=()'))  add('headers', 'minor', '`Permissions-Policy` does not restrict `microphone`');
    if (!pp.includes('geolocation=()')) add('headers', 'minor', '`Permissions-Policy` does not restrict `geolocation`');
  }
}

// ─── Audit 2: Cookies pre-consent ─────────────────────────────────────────────

const ESSENTIAL_COOKIES = ['__session', '__host', 'csrf', 'csrftoken', 'consent', 'next-auth'];
const NON_ESSENTIAL_PATTERNS = [/_ga$/, /_gid$/, /_fbp/, /^_gcl/, /hubspot/i, /analytics/i, /tracking/i];

async function auditCookies(baseUrl) {
  const res = await fetchWithMeta(baseUrl, {
    headers: { Cookie: '' } // fresh cookie jar
  });
  if (!res) {
    add('cookies', 'blocker', `Cannot reach ${baseUrl} to check cookie pre-consent`);
    return;
  }

  // Collect all Set-Cookie headers
  const setCookieHeaders = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean);

  for (const cookieStr of setCookieHeaders) {
    if (!cookieStr) continue;
    const name = cookieStr.split('=')[0].trim();

    // Check if non-essential cookie set before consent
    const isEssential = ESSENTIAL_COOKIES.some(e => name.toLowerCase().includes(e.toLowerCase()));
    const isNonEssential = NON_ESSENTIAL_PATTERNS.some(p => p.test(name));

    if (isNonEssential) {
      add('cookies', 'blocker', `Non-essential cookie \`${name}\` set before user consent — RGPD violation`);
    }

    // Check security flags
    const lc = cookieStr.toLowerCase();
    if (!lc.includes('secure'))    add('cookies', 'blocker', `Cookie \`${name}\` missing \`Secure\` flag — transmissible over HTTP`);
    if (!lc.includes('httponly') && isEssential) add('cookies', 'major', `Session cookie \`${name}\` missing \`HttpOnly\` flag — readable via XSS`);
    if (!lc.includes('samesite')) add('cookies', 'major', `Cookie \`${name}\` missing \`SameSite\` attribute — CSRF risk`);
    if (lc.includes('samesite=none') && !lc.includes('secure'))
      add('cookies', 'blocker', `Cookie \`${name}\` has \`SameSite=None\` without \`Secure\` — browsers will reject it`);
  }

  if (setCookieHeaders.length === 0) {
    // No cookies at all — check that a consent banner exists in the HTML
    const html = await res.text().catch(() => '');
    const hasConsentBanner = /cookie|consent|rgpd|gdpr/i.test(html);
    if (!hasConsentBanner) {
      add('cookies', 'minor', 'No cookies set and no consent banner detected in HTML — verify cookie consent implementation');
    }
  }
}

// ─── Audit 3: Dependencies ────────────────────────────────────────────────────

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

async function auditDependencies() {
  try {
    const output = execSync('pnpm audit --json 2>/dev/null', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 60000,
    });

    let data;
    try { data = JSON.parse(output); } catch { data = null; }

    if (!data) {
      add('dependencies', 'minor', 'pnpm audit output could not be parsed as JSON — run manually');
      return;
    }

    const vulns = data.vulnerabilities || {};
    let critical = 0, high = 0, moderate = 0, low = 0;

    for (const [name, v] of Object.entries(vulns)) {
      switch (v.severity) {
        case 'critical':
          critical++;
          add('dependencies', 'blocker', `CRITICAL vulnerability in \`${name}\` @ ${v.range}${v.fixAvailable ? ` — fix: \`pnpm update ${name}\`` : ' — no direct fix available'}`);
          break;
        case 'high':
          high++;
          add('dependencies', 'blocker', `HIGH vulnerability in \`${name}\` @ ${v.range}${v.fixAvailable ? ` — fix: \`pnpm update ${name}\`` : ' — no direct fix available'}`);
          break;
        case 'moderate':
          moderate++;
          add('dependencies', 'major', `MODERATE vulnerability in \`${name}\` @ ${v.range}`);
          break;
        case 'low':
          low++;
          add('dependencies', 'minor', `LOW vulnerability in \`${name}\` @ ${v.range}`);
          break;
      }
    }

    if (critical === 0 && high === 0 && moderate === 0 && low === 0) {
      // Explicit pass
    }
  } catch (err) {
    if (err.status !== 0 && err.stdout) {
      // pnpm audit exits non-zero when vulnerabilities exist — try parsing
      try {
        const data = JSON.parse(err.stdout);
        const count = Object.keys(data.vulnerabilities || {}).length;
        if (count > 0) {
          add('dependencies', 'blocker', `pnpm audit found ${count} vulnerabilities — run \`pnpm audit\` for details`);
        }
      } catch {
        add('dependencies', 'major', 'pnpm audit exited with non-zero status — run manually to inspect');
      }
    } else {
      add('dependencies', 'minor', `pnpm audit could not run: ${err.message}`);
    }
  }

  // Lock file check
  const lockPath = resolve(REPO_ROOT, 'pnpm-lock.yaml');
  if (!existsSync(lockPath)) {
    add('dependencies', 'major', '`pnpm-lock.yaml` not found — reproducible installs not guaranteed');
  }
}

// ─── Render report section ────────────────────────────────────────────────────

function countByArea(area) {
  const fs = findings[area];
  return {
    blockers: fs.filter(f => f.severity === 'blocker').length,
    majors:   fs.filter(f => f.severity === 'major').length,
    minors:   fs.filter(f => f.severity === 'minor').length,
    skips:    fs.filter(f => f.severity === 'skip').length,
  };
}

function renderSection(title, area) {
  const c = countByArea(area);
  const v = verdict(findings[area]);
  const skipped = findings[area].filter(f => f.severity === 'skip');
  const lines = [
    `## \`${area}\` — ${v}`,
    '',
    `### BLOCKERS (${c.blockers})`,
    '',
    findings[area].filter(f => f.severity === 'blocker').map(f => `- ${f.message}`).join('\n') || '_None_ ✓',
    '',
    `### MAJORS (${c.majors})`,
    '',
    findings[area].filter(f => f.severity === 'major').map(f => `- ${f.message}`).join('\n') || '_None_ ✓',
    '',
    `### MINORS (${c.minors})`,
    '',
    findings[area].filter(f => f.severity === 'minor').map(f => `- ${f.message}`).join('\n') || '_None_ ✓',
  ];
  if (skipped.length > 0) {
    lines.push('', `### SKIPPED (${c.skips})`, '', skipped.map(f => `- ⏭️ ${f.message}`).join('\n'));
  }
  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Verify root is reachable
  const rootRes = await fetchWithMeta(BASE_URL);
  if (!rootRes) {
    console.error(`ERROR: Cannot reach ${BASE_URL}. Start the dev server first.`);
    process.exit(1);
  }

  // Run all three automated audits in parallel
  await Promise.all([
    auditHeaders(BASE_URL),
    auditCookies(BASE_URL),
    auditDependencies(),
  ]);

  // Build score table
  const areas = ['headers', 'cookies', 'dependencies'];
  const totals = areas.reduce((acc, a) => {
    const c = countByArea(a);
    acc.blockers += c.blockers;
    acc.majors   += c.majors;
    acc.minors   += c.minors;
    return acc;
  }, { blockers: 0, majors: 0, minors: 0 });

  const overallVerdict = totals.blockers > 0 ? '🔴 Red' : totals.majors > 0 ? '🟡 Yellow' : '🟢 Green';

  const scoreTable = [
    '| Area | Blockers | Majors | Minors | Verdict |',
    '|---|---|---|---|---|',
    ...areas.map(a => {
      const c = countByArea(a);
      return `| ${a} | ${c.blockers} | ${c.majors} | ${c.minors} | ${verdict(findings[a])} |`;
    }),
    `| **TOTAL (automated)** | **${totals.blockers}** | **${totals.majors}** | **${totals.minors}** | **${overallVerdict}** |`,
  ].join('\n');

  // Fix priority list (blockers by area, then majors)
  const priority = [];
  for (const a of areas) {
    for (const f of findings[a].filter(x => x.severity === 'blocker')) {
      priority.push(`[${a.toUpperCase()} — BLOCKER] ${f.message}`);
    }
  }
  for (const a of areas) {
    for (const f of findings[a].filter(x => x.severity === 'major')) {
      priority.push(`[${a.toUpperCase()} — MAJOR] ${f.message}`);
    }
  }
  const fixPriority = priority.length > 0
    ? priority.map((p, i) => `${i + 1}. ${p}`).join('\n')
    : '_No automated fixes required. Check code audit findings in the full report._';

  // Assemble runner output (network-based sections only)
  const report = [
    `<!-- RUNNER OUTPUT — network-based checks: headers, cookies, dependencies -->`,
    `<!-- Code audit (inputs, secrets, RGPD, Next.js) is appended by SKILL.md -->`,
    '',
    renderSection('HTTP headers', 'headers'),
    '',
    '---',
    '',
    renderSection('Cookies & pre-consent', 'cookies'),
    '',
    '---',
    '',
    renderSection('Dependencies', 'dependencies'),
    '',
    '---',
    '',
    '## Automated score summary (runner)',
    '',
    scoreTable,
    '',
    '### Automated fix priority',
    '',
    fixPriority,
  ].join('\n');

  process.stdout.write(report + '\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Runner error:', err.message);
  process.exit(1);
});
