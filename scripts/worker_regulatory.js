const fs = require('fs');
const path = require('path');
const { GDRIVE_ROOT, delay, scrapeTest, discoverTestIdsFromPage } = require('./worker_core');

async function run() {
  console.log("⚖️ [Worker 3: Regulatory Bodies] Starting...");
  
  const EXAMS = [
    { slug: "rbi-grade-b", code: "RBI_GRADE_B_2026", folder: "RBI_GRADE_B", stage: "PHASE_1", subFolder: "01_PHASE1_FULL_MOCKS" },
    { slug: "sebi-grade-a", code: "SEBI_GRADE_A_2026", folder: "SEBI_GRADE_A", stage: "PAPER_1", subFolder: "01_PAPER1_FULL_MOCKS" },
    { slug: "nabard-grade-a", code: "NABARD_GRADE_A_2026", folder: "NABARD_GRADE_A", stage: "PRELIMS", subFolder: "01_PRELIMS_FULL_MOCKS" }
  ];

  for (const ex of EXAMS) {
    const destDir = path.join(GDRIVE_ROOT, "Regulatory", ex.folder, ex.subFolder);
    fs.mkdirSync(destDir, { recursive: true });

    console.log(`🔍 [Worker 3] Discovering tests for ${ex.folder}...`);
    const tests = await discoverTestIdsFromPage(ex.slug);
    console.log(`📋 [Worker 3] Found ${tests.length} tests for ${ex.folder}`);

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const filename = `${ex.folder}_Test_${(i + 1).toString().padStart(2, '0')}.json`;
      await scrapeTest(t.id, t.title, ex.code, ex.stage, destDir, filename);
      await delay(450);
    }
  }

  console.log("🎉 [Worker 3: Regulatory Bodies] FINISHED!");
}

run();
