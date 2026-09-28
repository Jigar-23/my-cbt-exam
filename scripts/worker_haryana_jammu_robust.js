/**
 * Robust Haryana & Jammu Dedicated Ingestor
 * Ingests Punjab & Haryana High Court Clerk, Haryana CET Group D & Mains, and JKSSB series.
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

const TARGETS = [
  { domain: "State_PSC", seriesId: "6a1582682fe9fcb25cd3d0b7", examName: "HARYANA_HC_CLERK_2026", examCode: "HARYANA_HC", stage: "Clerk Mocks & PYPs" },
  { domain: "State_PSC", seriesId: "6a356a848e97ad8cb6da287a", examName: "HARYANA_CET_GROUP_D_2026", examCode: "HARYANA_CET_D", stage: "Group D Full Tests" },
  { domain: "State_PSC", seriesId: "69400fbf4556ee86067d15f4", examName: "HARYANA_CET_MAINS_2025", examCode: "HARYANA_CET_M", stage: "CGL & CHSL Mains" },
  { domain: "State_PSC", seriesId: "69661e0d7bd45895d39a6784", examName: "JKSSB_JR_ASST_STENO_2026", examCode: "JKSSB", stage: "Junior Assistant & Steno" }
];

async function exhaustSeries(target) {
  console.log(`\n🚀 Ingesting ${target.examName} (${target.seriesId})...`);
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

  console.log(`✅ [${target.examName}] FINISHED: ${totalSaved} Tests Safely Stored!\n`);
  return totalSaved;
}

async function run() {
  console.log("🌟 Launching Haryana & Jammu Dedicated Fleet...");
  for (const target of TARGETS) {
    await exhaustSeries(target);
  }
  console.log("🎉 HARYANA & JAMMU INGESTION COMPLETED!");
}

run();
