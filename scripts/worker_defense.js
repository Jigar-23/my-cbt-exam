const fs = require('fs');
const path = require('path');
const { GDRIVE_ROOT, delay, scrapeTest, discoverTestIdsFromPage } = require('./worker_core');

async function run() {
  console.log("🛡️ [Worker 4: Defense Officers] Starting...");
  
  const EXAMS = [
    { slug: "cds", code: "UPSC_CDS_2026", folder: "UPSC_CDS", stage: "WRITTEN", subFolder: "01_FULL_MOCKS" },
    { slug: "afcat", code: "AFCAT_2026", folder: "AFCAT", stage: "CBT", subFolder: "01_FULL_MOCKS" },
    { slug: "capf-ac", code: "UPSC_CAPF_2026", folder: "UPSC_CAPF", stage: "PAPER_1", subFolder: "01_PAPER1_FULL_MOCKS" }
  ];

  for (const ex of EXAMS) {
    const destDir = path.join(GDRIVE_ROOT, "Defense", ex.folder, ex.subFolder);
    fs.mkdirSync(destDir, { recursive: true });

    console.log(`🔍 [Worker 4] Discovering tests for ${ex.folder}...`);
    const tests = await discoverTestIdsFromPage(ex.slug);
    console.log(`📋 [Worker 4] Found ${tests.length} tests for ${ex.folder}`);

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const filename = `${ex.folder}_Test_${(i + 1).toString().padStart(2, '0')}.json`;
      await scrapeTest(t.id, t.title, ex.code, ex.stage, destDir, filename);
      await delay(450);
    }
  }

  console.log("🎉 [Worker 4: Defense Officers] FINISHED!");
}

run();
