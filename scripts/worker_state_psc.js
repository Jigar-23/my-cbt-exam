const { exhaustSeriesPack } = require('./universal_crawler_core');

async function runStatePscWorker() {
  console.log("🏛️ WORKER 4 (STATE PSCS & HIGH COURTS) LAUNCHED");
  
  // 1. Bihar STET Officer Paper-2 (All 360 Subject Modules)
  await exhaustSeriesPack("State_PSC", "6a7db1e7ea1df78958d4f9cb", "BIHAR_STET_OFFICER_P2", "STET_P2", "OFFICER_STAGE2");

  // 2. CG Vyapam SI Officer
  await exhaustSeriesPack("State_PSC", "6995c2b45dd9cd4b3ae1a991", "CG_VYAPAM_SI", "CG_SI", "WRITTEN_STAGE");

  // 3. BPSC Officer PGT Exam
  await exhaustSeriesPack("State_PSC", "66445e350ac06ef32780bcd5", "BPSC_OFFICER_PGT", "BPSC_PGT", "OFFICER_EXAM");

  // 4. 72nd BPSC CCE Prelims
  await exhaustSeriesPack("State_PSC", "69fb45df9cd4be8eb6936b00", "BPSC_CCE", "BPSC_72ND", "PRELIMS_FULL");

  // 5. MP Assistant Jail Superintendent
  await exhaustSeriesPack("State_PSC", "69a57e7f7fc9bd72cee751f4", "MP_ASST_JAIL_SUPERINTENDENT", "MP_JAIL", "OFFICER_EXAM");

  console.log("🎉 WORKER 4 (STATE PSCS) 100% FINISHED!");
}

runStatePscWorker();
