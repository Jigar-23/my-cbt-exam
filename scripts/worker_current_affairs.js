const { exhaustSeriesPack } = require('./universal_crawler_core');

async function runCAWorker() {
  console.log("📰 WORKER 2 (CURRENT AFFAIRS 2026 MEGA PACK) LAUNCHED");
  
  // Current Affairs (CA) 2026 Mega Pack (All 493 Tests across all monthly and topic sections)
  await exhaustSeriesPack("Civil_Services", "695775734ccf9df45af31a20", "CURRENT_AFFAIRS_MEGA_2026", "CA_2026", "MONTHLY_TOPIC_REVISION");

  console.log("🎉 WORKER 2 (CURRENT AFFAIRS) 100% FINISHED!");
}

runCAWorker();
