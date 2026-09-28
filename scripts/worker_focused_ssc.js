/**
 * Focused Worker: SSC Mega Extraction
 * Target: SSC CGL 2026 (2,349 tests), SSC CHSL 2026 (2,498 tests), SSC CPO (474 tests), SSC MTS (667 tests), Stenographer (433 tests), Selection Post (573 tests).
 */

const { exhaustSeriesPack } = require('./universal_crawler_core');

const SSC_TARGETS = [
  { domain: "SSC", seriesId: "6960d60ab4975a8fe9557df7", examName: "SSC_CGL_2026", examCode: "SSC_CGL", stage: "Full Mocks & Practice" },
  { domain: "SSC", seriesId: "6971ffb9247a3fbd0651f152", examName: "SSC_CHSL_2026", examCode: "SSC_CHSL", stage: "Tier I & Tier II" },
  { domain: "SSC", seriesId: "69c661205ba135daec669610", examName: "SSC_CPO_2026", examCode: "SSC_CPO", stage: "Tier I & Tier II" },
  { domain: "SSC", seriesId: "69c4d8ff7ec09bc7a518d5f6", examName: "SSC_MTS_2026", examCode: "SSC_MTS", stage: "Full Mocks & PYPs" },
  { domain: "SSC", seriesId: "69b15db88115693c12ccc338", examName: "SSC_STENO_2026", examCode: "SSC_STENO", stage: "Grade C & D" },
  { domain: "SSC", seriesId: "698aee16bab7111e9ad868f8", examName: "SSC_SELECTION_POST_14", examCode: "SSC_SEL_14", stage: "Phase 14" }
];

async function run() {
  console.log("🚀 Launching Focused SSC Mega Extraction Worker...");
  for (const t of SSC_TARGETS) {
    try {
      await exhaustSeriesPack(t.domain, t.seriesId, t.examName, t.examCode, t.stage);
    } catch (e) {
      console.error(`Error on SSC ${t.examName}:`, e.message);
    }
  }
  console.log("\n🎉 FOCUSED SSC WORKER FINISHED!");
}

run();
