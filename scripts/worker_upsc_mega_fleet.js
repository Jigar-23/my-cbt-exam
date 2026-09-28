/**
 * Dedicated Continuous UPSC Mega Fleet Worker
 * Extracts all UPSC Civil Services, CAPF, EPFO, CDS, and Current Affairs test packs.
 */

const { exhaustSeriesPack } = require('./universal_crawler_core');

const UPSC_FLEET = [
  { domain: "Civil_Services", seriesId: "6a1d88acc876e0919260675f", examName: "UPSC_CSE_PRELIMS_2027", examCode: "UPSC_CSE", stage: "Prelims Mocks & Tests" },
  { domain: "Civil_Services", seriesId: "6880d559c93fc8f33720ebb9", examName: "UPSC_EPFO_COMBINED", examCode: "UPSC_EPFO", stage: "EO/AO & APFC Shifts" },
  { domain: "Defense", seriesId: "6a181defe78840d593c511cf", examName: "UPSC_CDS_02_2026", examCode: "UPSC_CDS", stage: "Official Shifts & Mocks" },
  { domain: "Defense", seriesId: "6660671c697431074496162f", examName: "UPSC_CAPF_ASI_HC", examCode: "UPSC_CAPF", stage: "Officer & Sectional Mocks" },
  { domain: "Civil_Services", seriesId: "695775734ccf9df45af31a20", examName: "CURRENT_AFFAIRS_2026", examCode: "CA_2026", stage: "Monthly & Topic CA" },
  { domain: "Civil_Services", seriesId: "678cdc0072bba7bf645163a8", examName: "CURRENT_AFFAIRS_2025", examCode: "CA_2025", stage: "Mega Revision 2025" }
];

async function run() {
  console.log("🚀 Launching Continuous UPSC Mega Fleet Worker...");
  for (const t of UPSC_FLEET) {
    try {
      console.log(`\n🎯 Starting Ingestion for ${t.examName} (${t.seriesId})...`);
      await exhaustSeriesPack(t.domain, t.seriesId, t.examName, t.examCode, t.stage);
    } catch (e) {
      console.error(`Error on ${t.examName}:`, e.message);
    }
  }
  console.log("\n🎉 CONTINUOUS UPSC MEGA FLEET FINISHED!");
}

run();
