const fs = require('fs');
const path = require('path');
const { GDRIVE_ROOT, delay, scrapeTest, discoverTestIdsFromPage } = require('./worker_core');

async function run() {
  console.log("🏛️ [Worker 2: Civil Services & UPSC] Starting...");
  
  const EXAMS = [
    { slug: "upsc-civil-services", code: "UPSC_CSE_GS1", folder: "UPSC_CSE_GS1", stage: "UPSC_GS1", subFolder: "01_FULL_MOCKS" },
    { slug: "upsc-civil-services-csat-goal", code: "UPSC_CSE_CSAT", folder: "UPSC_CSE_CSAT", stage: "CSAT", subFolder: "01_FULL_MOCKS" },
    { slug: "upsc-civil-services-previous", code: "UPSC_CSE_PYQ", folder: "UPSC_CSE_GS1", stage: "PYQ", subFolder: "02_PREVIOUS_YEAR_PAPERS" }
  ];

  for (const ex of EXAMS) {
    const destDir = path.join(GDRIVE_ROOT, "Civil_Services", ex.folder, ex.subFolder);
    fs.mkdirSync(destDir, { recursive: true });

    console.log(`🔍 [Worker 2] Discovering tests for ${ex.folder}...`);
    const tests = await discoverTestIdsFromPage(ex.slug);
    console.log(`📋 [Worker 2] Found ${tests.length} tests for ${ex.folder}`);

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const filename = `${ex.folder}_Test_${(i + 1).toString().padStart(2, '0')}.json`;
      await scrapeTest(t.id, t.title, ex.code, ex.stage, destDir, filename);
      await delay(450);
    }
  }

  console.log("🎉 [Worker 2: Civil Services & UPSC] FINISHED!");
}

run();
