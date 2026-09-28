/**
 * Parallel Focused Worker: SSC CHSL & SSC CPO
 */

const { exhaustSeriesPack } = require('./universal_crawler_core');

const TARGETS = [
  { domain: "SSC", seriesId: "6971ffb9247a3fbd0651f152", examName: "SSC_CHSL_2026", examCode: "SSC_CHSL", stage: "Tier I & Tier II" },
  { domain: "SSC", seriesId: "69c661205ba135daec669610", examName: "SSC_CPO_2026", examCode: "SSC_CPO", stage: "Tier I & Tier II" }
];

async function run() {
  console.log("🚀 Launching Parallel SSC CHSL & CPO Worker...");
  for (const t of TARGETS) {
    try {
      await exhaustSeriesPack(t.domain, t.seriesId, t.examName, t.examCode, t.stage);
    } catch (e) {
      console.error(`Error on SSC ${t.examName}:`, e.message);
    }
  }
  console.log("\n🎉 PARALLEL SSC CHSL & CPO WORKER FINISHED!");
}

run();
