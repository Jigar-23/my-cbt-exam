const fs = require('fs');
const path = require('path');
const { GDRIVE_ROOT, delay, scrapeTest, discoverTestIdsFromPage } = require('./worker_core');

async function run() {
  console.log("🏦 [Worker 1: Banking Officers] Starting...");
  
  const EXAMS = [
    { slug: "sbi-po", code: "SBI_PO_2026", folder: "SBI_PO", stage: "MAINS", subFolder: "02_MAINS_FULL_MOCKS" },
    { slug: "ibps-po", code: "IBPS_PO_2026", folder: "IBPS_PO", stage: "PRELIMS", subFolder: "01_PRELIMS_FULL_MOCKS" },
    { slug: "ibps-rrb-po", code: "IBPS_RRB_PO_2026", folder: "IBPS_RRB_PO", stage: "PRELIMS", subFolder: "01_PRELIMS_FULL_MOCKS" }
  ];

  for (const ex of EXAMS) {
    const destDir = path.join(GDRIVE_ROOT, "Banking", ex.folder, ex.subFolder);
    fs.mkdirSync(destDir, { recursive: true });

    console.log(`🔍 [Worker 1] Discovering tests for ${ex.folder}...`);
    const tests = await discoverTestIdsFromPage(ex.slug);
    console.log(`📋 [Worker 1] Found ${tests.length} tests for ${ex.folder}`);

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const filename = `${ex.folder}_Test_${(i + 1).toString().padStart(2, '0')}.json`;
      await scrapeTest(t.id, t.title, ex.code, ex.stage, destDir, filename);
      await delay(400);
    }
  }

  console.log("🎉 [Worker 1: Banking Officers] FINISHED!");
}

run();
