/**
 * Parallel Ingestion Engine - Simultaneous Execution for All Remaining Series
 */

const fs = require('fs');
const path = require('path');
const { ingestSingleTestRobust, sanitizeFolderName } = require('./civil_services_robust_crawler');

const authJsonPath = path.join(__dirname, '..', 'testbook_auth.json');
let auth = { authorization: "", cookie: "" };
if (fs.existsSync(authJsonPath)) {
  try { auth = JSON.parse(fs.readFileSync(authJsonPath, 'utf8')); } catch(e) {}
}

const headers = {
  "Authorization": auth.authorization,
  "Cookie": auth.cookie,
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
  "Referer": "https://testbook.com/",
  "Origin": "https://testbook.com",
  "Content-Type": "application/json"
};

const GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER";

const ALL_PARALLEL_TARGETS = [
  { domain: "Civil_Services", seriesId: "6a1d88acc876e0919260675f", examName: "UPSC_CSE_PRELIMS_2027", examCode: "UPSC_CSE_2027", stage: "PrepLab & Full Mocks" },
  { domain: "Civil_Services", seriesId: "6911e3dfefbd8407a95eaf3e", examName: "UPSC_CSAT_SERIES", examCode: "UPSC_CSAT", stage: "PYPs, Chapter & Sectionals" },
  { domain: "Civil_Services", seriesId: "62277d54111e9c2e906634ca", examName: "POLITY_ALL_PSC", examCode: "POLITY_PSC", stage: "UPSC & State Level Tests" },
  { domain: "Civil_Services", seriesId: "6214a6839c797acaa405a83b", examName: "HISTORY_ALL_PSC", examCode: "HISTORY_PSC", stage: "UPSC & State Level Tests" },
  { domain: "Civil_Services", seriesId: "6343cf21ffc353a155d237bc", examName: "GEOGRAPHY_ALL_PSC", examCode: "GEO_PSC", stage: "UPSC & State Level Tests" },
  { domain: "Defense", seriesId: "699c28f60e7808f2357a42bc", examName: "UPSC_CAPF_AC_2026", examCode: "UPSC_CAPF", stage: "Officer GS & GMA Mocks" },
  { domain: "Civil_Services", seriesId: "6880d559c93fc8f33720ebb9", examName: "UPSC_EPFO_COMBINED", examCode: "UPSC_EPFO", stage: "EO/AO & APFC Mocks" },
  { domain: "State_PSC", seriesId: "69400fbf4556ee86067d15f4", examName: "HARYANA_CET_MAINS_2025", examCode: "HARYANA_CET_M", stage: "CGL & CHSL Mains" },
  { domain: "State_PSC", seriesId: "69661e0d7bd45895d39a6784", examName: "JKSSB_JR_ASST_STENO_2026", examCode: "JKSSB", stage: "Junior Assistant & Steno" }
];

async function exhaustSeries(target) {
  console.log(`🚀 [PARALLEL] Starting ${target.examName} (${target.seriesId})...`);
  const seriesUrl = `https://api.testbook.com/api/v2/test-series/${target.seriesId}`;
  let sections = [];
  try {
    const res = await fetch(seriesUrl, { headers });
    if (res.ok) {
      const j = await res.json();
      sections = j.data?.details?.sections || j.data?.sections || [];
    }
  } catch (e) {}

  let totalSaved = 0;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const secName = sec.name || `Section_${sIdx + 1}`;
    const subSections = sec.subsections || sec.subSections || [{ id: sec.id, name: secName }];

    for (let subIdx = 0; subIdx < subSections.length; subIdx++) {
      const sub = subSections[subIdx];
      const subName = sub.name || `Sub_${subIdx + 1}`;
      const folderSlug = `${(sIdx + 1).toString().padStart(2, '0')}_${sanitizeFolderName(secName)}_${sanitizeFolderName(subName)}`;
      const outDir = path.join(GDRIVE_ROOT, target.domain, target.examName, folderSlug);

      let skip = 0;
      let flatCount = 0;

      while (true) {
        const url = `https://api.testbook.com/api/v2/test-series/${target.seriesId}/tests/details?sectionId=${sec.id}&subSectionId=${sub.id}&limit=100&skip=${skip}`;
        let tests = [];
        try {
          const r = await fetch(url, { headers });
          if (r.ok) {
            const jd = await r.json();
            tests = jd.data?.tests || jd.data || [];
          }
        } catch (e) {}

        if (!Array.isArray(tests) || tests.length === 0) break;

        // Process in chunks of 5 parallel requests
        for (let i = 0; i < tests.length; i += 5) {
          const chunk = tests.slice(i, i + 5);
          await Promise.all(chunk.map(async (t, cIdx) => {
            if (!t.id) return;
            const prefix = `${target.examCode}_${(flatCount + i + cIdx + 1).toString().padStart(3, '0')}`;
            const success = await ingestSingleTestRobust(t.id, outDir, prefix, target.examCode, target.stage, t.title);
            if (success) totalSaved++;
          }));
        }

        flatCount += tests.length;
        if (tests.length < 100) break;
        skip += 100;
      }
    }
  }

  console.log(`✅ [PARALLEL] Finished ${target.examName}: ${totalSaved} tests stored!`);
  return totalSaved;
}

async function run() {
  console.log(`⚡ Launching all ${ALL_PARALLEL_TARGETS.length} series concurrently in parallel!`);
  await Promise.all(ALL_PARALLEL_TARGETS.map(t => exhaustSeries(t)));
  console.log("🎉 ALL PARALLEL TARGETS COMPLETED 100%!");
}

run();
