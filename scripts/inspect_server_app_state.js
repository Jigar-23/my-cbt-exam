const fs = require('fs');

async function extractServerState() {
  console.log("🔍 Fetching https://testbook.com/online-test-series to extract embedded serverApp-state...");
  const res = await fetch("https://testbook.com/online-test-series", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  const html = await res.text();
  const match = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!match) {
    console.log("❌ serverApp-state script not found.");
    return;
  }

  let rawJson = match[1]
    .replace(/&q;/g, '"')
    .replace(/&a;/g, '&')
    .replace(/&s;/g, "'")
    .replace(/&l;/g, '<')
    .replace(/&g;/g, '>');

  try {
    const data = JSON.parse(rawJson);
    console.log(`✅ Successfully parsed serverApp-state! Keys:`, Object.keys(data));
    
    // Write out the parsed state for deep inspection
    fs.writeFileSync('scripts/serverApp_state_extracted.json', JSON.stringify(data, null, 2));
    console.log(`Saved full serverApp-state to scripts/serverApp_state_extracted.json`);

    // Let's search all keys for test series arrays
    const allFoundSeries = [];
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (key.includes("test-series") || key.includes("testSeries") || key.includes("api/v2")) {
        console.log(`\n🎯 Found relevant state key: "${key}" (type: ${typeof val})`);
        if (val && typeof val === "object") {
          const list = val.data?.testSeries || val.testSeries || (Array.isArray(val.data) ? val.data : []);
          console.log(`   Contains ${list.length} series`);
          for (const s of list) {
            const d = s.details || s;
            const id = s._id || s.id || d._id || d.id;
            const title = d.title || d.name;
            const count = (d.paidTestCount || 0) + (d.freeTestCount || 0);
            if (id && title) {
              allFoundSeries.push({ id, title, count, key });
              console.log(`   -> [${id}] "${title}" (${count} tests)`);
            }
          }
        }
      }
    }

    console.log(`\n🎉 Total unique test series extracted from page state: ${allFoundSeries.length}`);
  } catch (e) {
    console.error("JSON parse error:", e.message);
  }
}

extractServerState();
