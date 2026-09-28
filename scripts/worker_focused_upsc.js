/**
 * Focused Worker: UPSC & Civil Services
 * Target: UPSC Civil Services 2027 Prelims (230 tests), UPSC EPFO (328 tests), Current Affairs 2026 (493 tests), UPSC CDS 02/2026 (326 tests).
 */

const { exhaustSeriesPack } = require('./universal_crawler_core');

const UPSC_TARGETS = [
  { domain: "Civil_Services", seriesId: "6a1d88acc876e0919260675f", examName: "UPSC_CSE_PRELIMS_2027", examCode: "UPSC_CSE_2027", stage: "Prelims Mocks" },
  { domain: "Civil_Services", seriesId: "6880d559c93fc8f33720ebb9", examName: "UPSC_EPFO_COMBINED", examCode: "UPSC_EPFO", stage: "EO/AO & APFC" },
  { domain: "Civil_Services", seriesId: "695775734ccf9df45af31a20", examName: "CURRENT_AFFAIRS_2026", examCode: "CA_2026", stage: "Monthly & Topic CA" },
  { domain: "Defense", seriesId: "6a181defe78840d593c511cf", examName: "UPSC_CDS_02_2026", examCode: "UPSC_CDS", stage: "Official Shifts & Mocks" }
];

async function run() {
  console.log("🚀 Launching Focused UPSC & Civil Services Extraction Worker...");
  for (const t of UPSC_TARGETS) {
    try {
      await exhaustSeriesPack(t.domain, t.seriesId, t.examName, t.examCode, t.stage);
    } catch (e) {
      console.error(`Error on UPSC ${t.examName}:`, e.message);
    }
  }
  console.log("\n🎉 FOCUSED UPSC & CIVIL SERVICES WORKER FINISHED!");
}

run();
