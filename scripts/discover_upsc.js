const fs = require('fs');
const path = require('path');

const authJsonPath = path.join(__dirname, '..', 'testbook_auth.json');
let auth = { authorization: "", cookie: "" };
if (fs.existsSync(authJsonPath)) {
  try {
    auth = JSON.parse(fs.readFileSync(authJsonPath, 'utf8'));
  } catch (e) {}
}

const headers = {
  "Authorization": auth.authorization,
  "Cookie": auth.cookie,
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
  "Referer": "https://testbook.com/",
  "Origin": "https://testbook.com",
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*"
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function getSeriesMeta(seriesId) {
  try {
    const url = `https://api.testbook.com/api/v2/test-series/${seriesId}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || json;
  } catch (e) {
    return null;
  }
}

async function discover() {
  const knownSlugs = [
    "upsc-civil-services", "upsc-cse", "upsc-ias", "upsc-prelims", "upsc-mains",
    "upsc-epfo", "upsc-apfc", "upsc-capf-ac", "capf-ac", "cds", "upsc-cds",
    "nda", "upsc-nda", "upsc-ese", "upsc-ies", "upsc-cms", "upsc-geoscientist",
    "upsc-ifs", "upsc-iss", "upsc-cisf-ac"
  ];

  const seriesMap = new Map();

  for (const slug of knownSlugs) {
    try {
      const url = `https://api.testbook.com/api/v2/test-series?targetExam=${slug}&limit=20`;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const json = await res.json();
        const list = json.data?.testSeries || [];
        for (const item of list) {
          const d = item.details || {};
          if (d.id) {
            seriesMap.set(d.id, { id: d.id, name: d.name, slug: d.slug, targetExam: d.targetExam });
          }
        }
      }
    } catch(e) {}
    await delay(250);
  }

  // Also include the ones discovered from category search
  const extraIds = [
    "6a1d88acc876e0919260675f", // UPSC CSE Prelims 2027
    "6880d559c93fc8f33720ebb9", // UPSC EPFO EO/AO & APFC
    "63ff20f88495e4e531012d02", // UPSC EPFO APFC
    "6a181defe78840d593c511cf"  // UPSC CDS
  ];
  for (const id of extraIds) {
    if (!seriesMap.has(id)) {
      seriesMap.set(id, { id });
    }
  }

  const results = [];

  for (const [id, info] of seriesMap) {
    const meta = await getSeriesMeta(id);
    await delay(300);
    if (!meta) continue;
    
    const details = meta.details || meta;
    const stats = meta.stats || {};
    const sections = meta.sections || [];

    let totalTestsInSections = 0;
    const structuredSections = [];

    for (const sec of sections) {
      const secObj = {
        id: sec.id || sec._id,
        title: sec.title || sec.name,
        subSections: []
      };
      const subs = sec.subSections || [];
      for (const sub of subs) {
        const count = sub.testCount || sub.totalTests || (sub.tests ? sub.tests.length : 0);
        totalTestsInSections += count;
        secObj.subSections.push({
          id: sub.id || sub._id,
          title: sub.title || sub.name,
          testCount: count
        });
      }
      structuredSections.push(secObj);
    }

    results.push({
      id: details.id || id,
      name: details.name || info.name || "UPSC Test Series",
      slug: details.slug,
      targetExam: details.targetExam,
      totalTests: totalTestsInSections || stats.totalTests || 0,
      enrolledUsers: stats.totalUsers || 0,
      sections: structuredSections
    });
  }

  const outputPath = path.join(__dirname, '..', 'data', 'upsc_discovered_series.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Discovered ${results.length} UPSC Series. Saved to data/upsc_discovered_series.json`);
}

discover();
