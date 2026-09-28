/**
 * Robust UPSC & National Fleet Ingestion Runner
 * Ingests all UPSC, NCERT, and General Studies packs using the verified sections[] parser.
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

const UPSC_TARGETS = [
  { domain: "Civil_Services", seriesId: "68418c8d58481f2025692c19", examName: "UPSC_CSE_PRELIMS_2026", examCode: "UPSC_CSE_2026", stage: "Antim Prahar & GS Mocks" },
  { domain: "Civil_Services", seriesId: "6a1d88acc876e0919260675f", examName: "UPSC_CSE_PRELIMS_2027", examCode: "UPSC_CSE_2027", stage: "PrepLab & Full Mocks" },
  { domain: "Civil_Services", seriesId: "60d474a22f8bf44459e2aaa5", examName: "NCERT_FOUNDATION_GS", examCode: "NCERT_FND", stage: "History, Polity, Geo" },
  { domain: "Civil_Services", seriesId: "630c7889992a8c94f82da094", examName: "NCERT_BASED_GS", examCode: "NCERT_GS", stage: "Art, History, Governance" },
  { domain: "Civil_Services", seriesId: "693be0dc1be4079ba70a59ff", examName: "UPSC_BEGINNERS", examCode: "UPSC_BEG", stage: "Concept Builders & Quests" },
  { domain: "Civil_Services", seriesId: "6911e3dfefbd8407a95eaf3e", examName: "UPSC_CSAT_SERIES", examCode: "UPSC_CSAT", stage: "PYPs, Chapter & Sectionals" },
  { domain: "Civil_Services", seriesId: "62277d54111e9c2e906634ca", examName: "POLITY_ALL_PSC", examCode: "POLITY_PSC", stage: "UPSC & State Level Tests" },
  { domain: "Civil_Services", seriesId: "6214a6839c797acaa405a83b", examName: "HISTORY_ALL_PSC", examCode: "HISTORY_PSC", stage: "UPSC & State Level Tests" },
  { domain: "Civil_Services", seriesId: "6343cf21ffc353a155d237bc", examName: "GEOGRAPHY_ALL_PSC", examCode: "GEO_PSC", stage: "UPSC & State Level Tests" },
  { domain: "Defense", seriesId: "699c28f60e7808f2357a42bc", examName: "UPSC_CAPF_AC_2026", examCode: "UPSC_CAPF", stage: "Officer GS & GMA Mocks" },
  { domain: "Civil_Services", seriesId: "6880d559c93fc8f33720ebb9", examName: "UPSC_EPFO_COMBINED", examCode: "UPSC_EPFO", stage: "EO/AO & APFC Mocks" }
];

async function exhaustSeries(target) {
  console.log(`\n🚀 Starting Extraction for ${target.examName} (${target.seriesId})...`);
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

        for (const t of tests) {
          if (!t.id) continue;
          const prefix = `${target.examCode}_${(flatCount + 1).toString().padStart(3, '0')}`;
          const success = await ingestSingleTestRobust(t.id, outDir, prefix, target.examCode, target.stage, t.title);
          if (success) {
            flatCount++;
            totalSaved++;
            if (flatCount % 15 === 0 || flatCount === 1) {
              console.log(`  ⚡ [${target.examName} > ${secName}] Saved test ${flatCount}: "${t.title}"`);
            }
          }
        }

        if (tests.length < 100) break;
        skip += 100;
      }
    }
  }

  console.log(`✅ [${target.examName}] FINISHED: ${totalSaved} Complete Question Papers Stored!\n`);
  return totalSaved;
}

async function run() {
  console.log("🌟 Launching Master UPSC & National Ingestion Pass...");
  for (const target of UPSC_TARGETS) {
    await exhaustSeries(target);
  }
  console.log("🎉 MASTER UPSC & NATIONAL INGESTION PASS COMPLETED!");
}

run();
