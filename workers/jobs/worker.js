// Project Upskill jobs API (Cloudflare Worker)
// Fresher-friendly remote jobs from Himalayas and Remotive, in one JSON feed.
// Rules we follow: fetch about twice a day, link to each source, use their apply links.

const TTL = 12 * 60 * 60; // 12 hours. Both sources refresh about once a day.
const SENIOR = /\b(senior|sr\.?|lead|staff|principal|manager|head|director|architect|vp)\b/i;
const JUNIOR = /\b(junior|jr\.?|intern|internship|graduate|grad|entry[- ]level|trainee|fresher|apprentice)\b/i;
const UA = { 'User-Agent': 'ProjectUpskill/1.0 (personal job feed)' };

let memo = null; // fallback cache inside this Worker instance

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function iso(v) {
  const d = new Date(v);
  return isNaN(d) ? new Date(0).toISOString() : d.toISOString();
}

function money(j) {
  if (!j.minSalary && !j.maxSalary) return '';
  const r = [j.minSalary, j.maxSalary].filter(Boolean).map((n) => n.toLocaleString('en-US')).join('\u2013');
  return (j.currency || '') + ' ' + r + (j.salaryPeriod && j.salaryPeriod !== 'annual' ? ' / ' + j.salaryPeriod : ' / year');
}

async function himalayas() {
  const base = 'https://himalayas.app/jobs/api/search?sort=recent';
  const queries = ['&seniority=Entry-level&worldwide=true', '&seniority=Entry-level&country=IN', '&employment_type=Intern'];
  const out = [];
  for (const q of queries) {
    for (let page = 1; page <= 2; page++) {
      const r = await fetch(base + q + '&page=' + page, { headers: UA });
      if (!r.ok) break;
      const d = await r.json();
      const list = d.jobs || [];
      for (const j of list) {
        const locs = (j.locationRestrictions || []).map((l) => l.alpha2);
        const where = locs.length === 0 ? 'Worldwide' : locs.includes('IN') ? 'India' : null;
        if (!where || SENIOR.test(j.title || '')) continue;
        out.push({
          id: 'h:' + j.guid,
          title: j.title,
          company: j.companyName,
          url: j.applicationLink, // Himalayas requires its own apply link
          where,
          level: j.employmentType === 'Intern' ? 'Internship' : 'Entry-level',
          type: j.employmentType || '',
          date: iso((j.pubDate || 0) * 1000),
          salary: money(j),
          source: 'Himalayas',
          sourceUrl: 'https://himalayas.app',
        });
      }
      if (!list.length) break;
    }
  }
  return out;
}

async function remotive() {
  const r = await fetch('https://remotive.com/api/remote-jobs?category=software-dev', { headers: UA });
  if (!r.ok) return [];
  const d = await r.json();
  const out = [];
  for (const j of d.jobs || []) {
    const loc = j.candidate_required_location || '';
    const where = /worldwide|anywhere/i.test(loc) ? 'Worldwide' : /india|asia|apac/i.test(loc) ? 'India / Asia' : null;
    if (!where || SENIOR.test(j.title || '')) continue;
    out.push({
      id: 'r:' + j.id,
      title: j.title,
      company: j.company_name,
      url: j.url, // Remotive asks you to link back to its page
      where,
      level: JUNIOR.test(j.title || '') ? 'Entry-level' : 'Not stated',
      type: (j.job_type || '').replace(/_/g, ' '),
      date: iso(String(j.publication_date || '').replace(/Z?$/, 'Z')),
      salary: j.salary || '',
      source: 'Remotive',
      sourceUrl: 'https://remotive.com',
    });
  }
  return out;
}

async function build() {
  const [h, r] = await Promise.allSettled([himalayas(), remotive()]);
  const all = [...(h.status === 'fulfilled' ? h.value : []), ...(r.status === 'fulfilled' ? r.value : [])];
  const seen = new Set();
  const jobs = [];
  for (const j of all) {
    const k = (j.title + '|' + j.company).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    jobs.push(j);
  }
  jobs.sort((a, b) => b.date.localeCompare(a.date));
  return {
    updated: new Date().toISOString(),
    count: jobs.length,
    sources: [
      { name: 'Himalayas', url: 'https://himalayas.app' },
      { name: 'Remotive', url: 'https://remotive.com' },
    ],
    errors: [h, r].filter((x) => x.status === 'rejected').map((x) => String(x.reason)),
    jobs,
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
    const url = new URL(request.url);
    if (url.pathname !== '/jobs') {
      return new Response('Project Upskill jobs API. Open /jobs', { headers: cors() });
    }
    const json = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + TTL, ...cors() };

    // 1. Cloudflare's cache (works when the Worker runs on your own domain)
    const cache = caches.default;
    const key = new Request(url.origin + '/jobs?v=1');
    const hit = await cache.match(key);
    if (hit) return new Response(hit.body, { headers: json });

    // 2. This instance's memory
    if (memo && Date.now() - memo.t < TTL * 1000) return new Response(memo.body, { headers: json });

    // 3. Fetch fresh data
    const body = JSON.stringify(await build());
    memo = { t: Date.now(), body };
    ctx.waitUntil(cache.put(key, new Response(body, { headers: json })));
    return new Response(body, { headers: json });
  },
};
