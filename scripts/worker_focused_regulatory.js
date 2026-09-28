/**
 * Parallel Focused Worker: Regulatory Bodies (RBI, SEBI, NABARD, IFSCA)
 */

const { exhaustSeriesPack } = require('./universal_crawler_core');

const REGULATORY_TARGETS = [
  { domain: "Regulatory", seriesId: "668d4122122e2c135543d8e2", examName: "REGULATORY_MEGA_PACK", examCode: "REGULATORY", stage: "Officer Tests" },
  { domain: "Regulatory", seriesId: "69fb213dce2625afac297511", examName: "CIL_MGMT_TRAINEE_2026", examCode: "CIL_MT", stage: "Full Mocks" }
];

async function run() {
  console.log("🚀 Launching Regulatory Bodies Extraction Worker...");
  for (const t of REGULATORY_TARGETS) {
    try {
      await exhaustSeriesPack(t.domain, t.seriesId, t.examName, t.examCode, t.stage);
    } catch (e) {
      console.error(`Error on Regulatory ${t.examName}:`, e.message);
    }
  }
  console.log("\n🎉 REGULATORY WORKER FINISHED!");
}

run();
