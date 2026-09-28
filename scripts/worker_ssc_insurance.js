const fs = require('fs');
const path = require('path');
const { GDRIVE_ROOT, delay, scrapeTest, discoverTestIdsFromPage } = require('./worker_core');

async function run() {
  console.log("🏢 [Worker 5: SSC & Insurance] Starting...");
  
  const EXAMS = [
    { slug: "ssc-cgl", code: "SSC_CGL_2026", folder: "SSC_CGL", stage: "TIER_1", subFolder: "01_TIER1_FULL_MOCKS" },
    { slug: "lic-aao", code: "LIC_AAO_2026", folder: "LIC_AAO", stage: "PRELIMS", subFolder: "01_PRELIMS_FULL_MOCKS" }
  ];

  for (const ex of EXAMS) {
    const destDir = path.join(GDRIVE_ROOT, "SSC", ex.folder, ex.subFolder);
    fs.mkdirSync(destDir, { recursive: true });

    console.log(`🔍 [Worker 5] Discovering tests for ${ex.folder}...`);
    const tests = await discoverTestIdsFromPage(ex.slug);
    console.log(`📋 [Worker 5] Found ${tests.length} tests for ${ex.folder}`);

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const filename = `${ex.folder}_Test_${(i + 1).toString().padStart(2, '0')}.json`;
      await scrapeTest(t.id, t.title, ex.code, ex.stage, destDir, filename);
      await delay(450);
    }
  }

  console.log("🎉 [Worker 5: SSC & Insurance] FINISHED!");
}

run();
