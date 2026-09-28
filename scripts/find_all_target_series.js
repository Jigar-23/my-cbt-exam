const fs = require('fs');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2Njg5YTA5ZDJkYzgxNTNmMTA0Y2M0OWMiLCJpYXQiOjE3NjM1MzM3MzEsImV4cCI6MTc2NjEyNTczMX0.x8PjD2L3Lw00BvLhK0l9E4H9UoU4EwW3E6oO0T8xZ7E";

async function fetchCategory(category) {
  const url = `https://api.testbook.com/api/v2/test-series?category=${category}&limit=100&skip=0`;
  try {
    const res = await fetch(url, { headers: { "testbook-version": "3", "testbook-platform": "web", "usertoken": token } });
    const json = await res.json();
    const list = json.data?.testSeries || [];
    return list.map(item => {
      const d = item.details || {};
      return {
        id: d._id || d.id,
        title: d.title || d.name,
        slug: d.slug,
        testCount: (d.paidTestCount || 0) + (d.freeTestCount || 0),
        sectionsCount: d.sections?.length || 0
      };
    }).filter(x => !!x.id);
  } catch (e) {
    console.error(`Error fetching ${category}:`, e.message);
    return [];
  }
}

async function run() {
  console.log("🔍 Scanning Testbook Categories for Target Series...");

  const sscSeries = await fetchCategory("ssc");
  const civilSeries = await fetchCategory("civil-services");
  const regulatorySeries = await fetchCategory("regulatory-body-exams");
  const stateSeries = await fetchCategory("state-exams");

  console.log("\n=================== 🏆 SSC TEST SERIES ===================");
  for (const s of sscSeries) {
    console.log(`[SSC] ID: ${s.id} | Tests: ${s.testCount.toString().padStart(4, " ")} | Title: "${s.title}"`);
  }

  console.log("\n=================== 📜 UPSC & CIVIL SERVICES ===================");
  for (const s of civilSeries) {
    console.log(`[Civil_Services] ID: ${s.id} | Tests: ${s.testCount.toString().padStart(4, " ")} | Title: "${s.title}"`);
  }

  console.log("\n=================== ⚖️ REGULATORY BODIES ===================");
  for (const s of regulatorySeries) {
    console.log(`[Regulatory] ID: ${s.id} | Tests: ${s.testCount.toString().padStart(4, " ")} | Title: "${s.title}"`);
  }

  console.log("\n=================== 🏛️ HARYANA & JAMMU STATE EXAMS ===================");
  const haryanaJammu = stateSeries.filter(s => 
    /haryana|hpsc|hssc|jammu|jkpsc|j&k|jkssb|kas/i.test(s.title) ||
    /haryana|jammu|jkpsc|hpsc/i.test(s.slug || "")
  );
  for (const s of haryanaJammu) {
    console.log(`[State_PSC] ID: ${s.id} | Tests: ${s.testCount.toString().padStart(4, " ")} | Title: "${s.title}"`);
  }

  fs.writeFileSync('scripts/target_packs_catalog.json', JSON.stringify({
    ssc: sscSeries,
    civil: civilSeries,
    regulatory: regulatorySeries,
    haryanaJammu
  }, null, 2));

  console.log("\n✅ Target catalog saved to scripts/target_packs_catalog.json");
}

run();
