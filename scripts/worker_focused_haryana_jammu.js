/**
 * Focused Worker: Haryana & Jammu State PSC Exams
 * Target: Punjab & Haryana High Court Clerk (211 tests), Haryana CET Group D (173 tests).
 */

const { exhaustSeriesPack } = require('./universal_crawler_core');

const HARYANA_JAMMU_TARGETS = [
  { domain: "State_PSC", seriesId: "6a1582682fe9fcb25cd3d0b7", examName: "HARYANA_HC_CLERK_2026", examCode: "HARYANA_HC", stage: "Clerk Mocks & PYPs" },
  { domain: "State_PSC", seriesId: "6a356a848e97ad8cb6da287a", examName: "HARYANA_CET_GROUP_D_2026", examCode: "HARYANA_CET", stage: "Group D Full Tests" }
];

async function run() {
  console.log("🚀 Launching Focused Haryana & Jammu State Exam Worker...");
  for (const t of HARYANA_JAMMU_TARGETS) {
    try {
      await exhaustSeriesPack(t.domain, t.seriesId, t.examName, t.examCode, t.stage);
    } catch (e) {
      console.error(`Error on State PSC ${t.examName}:`, e.message);
    }
  }
  console.log("\n🎉 FOCUSED HARYANA & JAMMU STATE EXAM WORKER FINISHED!");
}

run();
