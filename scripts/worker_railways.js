const { exhaustSeriesPack } = require('./universal_crawler_core');

async function runRailwaysWorker() {
  console.log("🚆 WORKER 6 (RAILWAY RECRUITMENT BOARD OFFICERS) LAUNCHED");
  
  // 1. RRB NTPC Graduate Level CBT-2
  await exhaustSeriesPack("Railways", "68e4f124a4d902ea5ca9c860", "RRB_NTPC_GRADUATE", "RRB_NTPC_CBT2", "CBT_2");

  // 2. RRB JE Officer CBT
  await exhaustSeriesPack("Railways", "6a46696948bef137bf8fe2de", "RRB_JE_OFFICER", "RRB_JE", "CBT_STAGE");

  // 3. RRB General Science PYP
  await exhaustSeriesPack("Railways", "65cdd01b9bcb1115afad7b58", "RRB_GENERAL_SCIENCE_PYP", "RRB_SCI", "SCIENCE_DRILLS");

  // 4. RRB Section Controller
  await exhaustSeriesPack("Railways", "6a47a29a9e8e05a7a18d329b", "RRB_SECTION_CONTROLLER", "RRB_SC", "OFFICER_STAGE");

  console.log("🎉 WORKER 6 (RAILWAYS) 100% FINISHED!");
}

runRailwaysWorker();
