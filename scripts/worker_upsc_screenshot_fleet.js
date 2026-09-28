/**
 * UPSC & NCERT Screenshot Fleet Worker
 * Ingests all exact packs shown in the Testbook Civil Services screenshot catalog:
 * - UPSC Civil Services 2026 (Prelims) - 259 Tests
 * - NCERT Foundation for GS - 75 Tests
 * - NCERT Based GS - 92 Tests
 * - UPSC Beginners - 21 Tests
 * - UPSC CAPF Assistant Commandants 2026 - 178 Tests
 * - UPSC Civil Services CSAT - 61 Tests
 * - Polity for All PSC - 54 Tests
 * - History for All PSC - 59 Tests
 * - Geography for All PSC - 72 Tests
 * - UPSC Civil Services 2027 Prelims - 230 Tests
 */

const { exhaustSeriesPack } = require('./universal_crawler_core');

const SCREENSHOT_TARGETS = [
  { domain: "Civil_Services", seriesId: "68418c8d58481f2025692c19", examName: "UPSC_CSE_PRELIMS_2026", examCode: "UPSC_CSE_2026", stage: "Antim Prahar & GS Mocks" },
  { domain: "Civil_Services", seriesId: "60d474a22f8bf44459e2aaa5", examName: "NCERT_FOUNDATION_GS", examCode: "NCERT_FND", stage: "History, Polity, Geo" },
  { domain: "Civil_Services", seriesId: "630c7889992a8c94f82da094", examName: "NCERT_BASED_GS", examCode: "NCERT_GS", stage: "Art, History, Governance" },
  { domain: "Civil_Services", seriesId: "693be0dc1be4079ba70a59ff", examName: "UPSC_BEGINNERS", examCode: "UPSC_BEG", stage: "Concept Builders & Quests" },
  { domain: "Defense", seriesId: "699c28f60e7808f2357a42bc", examName: "UPSC_CAPF_AC_2026", examCode: "UPSC_CAPF", stage: "Officer GS & GMA Mocks" },
  { domain: "Civil_Services", seriesId: "6911e3dfefbd8407a95eaf3e", examName: "UPSC_CSAT_SERIES", examCode: "UPSC_CSAT", stage: "PYPs, Chapter & Sectionals" },
  { domain: "Civil_Services", seriesId: "62277d54111e9c2e906634ca", examName: "POLITY_ALL_PSC", examCode: "POLITY_PSC", stage: "UPSC & State Level Tests" },
  { domain: "Civil_Services", seriesId: "6214a6839c797acaa405a83b", examName: "HISTORY_ALL_PSC", examCode: "HISTORY_PSC", stage: "UPSC & State Level Tests" },
  { domain: "Civil_Services", seriesId: "6343cf21ffc353a155d237bc", examName: "GEOGRAPHY_ALL_PSC", examCode: "GEO_PSC", stage: "UPSC & State Level Tests" },
  { domain: "Civil_Services", seriesId: "6a1d88acc876e0919260675f", examName: "UPSC_CSE_PRELIMS_2027", examCode: "UPSC_CSE_2027", stage: "PrepLab & Full Mocks" }
];

async function run() {
  console.log("🚀 Launching UPSC & NCERT Screenshot Fleet Worker...");
  for (const t of SCREENSHOT_TARGETS) {
    try {
      console.log(`\n🎯 Ingesting ${t.examName} (${t.seriesId})...`);
      await exhaustSeriesPack(t.domain, t.seriesId, t.examName, t.examCode, t.stage);
    } catch (e) {
      console.error(`Error on ${t.examName}:`, e.message);
    }
  }
  console.log("\n🎉 UPSC & NCERT SCREENSHOT FLEET FINISHED!");
}

run();
