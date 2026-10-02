/**
 * repair_and_enrich_tests.js
 * 
 * Re-scrapes and enriches existing test papers in CBT_EXAM_MASTER on Google Drive:
 * 1. Pulls full Direction / Passage / Precondition text for all puzzle sets & reading comprehension.
 * 2. Unlocks and pulls 100% of official step-by-step solutions (ansObj.sol.en.value / sol.hn.value).
 * 3. Enriches options and verified answer keys.
 * 
 * Usage:
 *   node scripts/repair_and_enrich_tests.js [Category] [--force]
 * Examples:
 *   node scripts/repair_and_enrich_tests.js Banking
 *   node scripts/repair_and_enrich_tests.js all
 */

const fs = require('fs');
const path = require('path');

const VAULT_BASE = '/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER';

// Load Auth Credentials
let authToken = process.env.AUTH_TOKEN || "";
let cookieHeader = process.env.COOKIE || "";

const authJsonPath = path.join(__dirname, '..', 'testbook_auth.json');
if (fs.existsSync(authJsonPath)) {
  try {
    const authData = JSON.parse(fs.readFileSync(authJsonPath, 'utf8'));
    authToken = authData.authorization || authData.token || authToken;
    cookieHeader = authData.cookie || cookieHeader;
  } catch (e) {}
}

if (!authToken) {
  console.error('\n❌ No authorization token found in testbook_auth.json or AUTH_TOKEN env.');
  console.error('👉 Please provide your Testbook Authorization header or paste it into testbook_auth.json.\n');
  process.exit(1);
}

const headers = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Referer": "https://testbook.com/",
  "Origin": "https://testbook.com",
  "Authorization": authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`
};

if (cookieHeader) {
  headers["Cookie"] = cookieHeader;
}

function cleanHtml(str) {
  if (!str || typeof str !== 'string') return "";
  return str.trim();
}

async function fetchAnswers(testId) {
  const ansUrl = `https://api.testbook.com/api/v2/tests/${testId}/answers`;
  try {
    // 1. Try fetching answers directly in case test was already submitted
    let res = await fetch(ansUrl, { headers });
    if (!res.ok) {
      // 2. If not accessible yet, submit attempt to unlock solutions
      const subRes = await fetch(`https://api.testbook.com/api/v2/tests/${testId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ task: "submit", responses: {} })
      });
      if (subRes.status === 429) {
        console.log(`   ⏳ Throttled (429). Pausing 25s to cool down...`);
        await new Promise(r => setTimeout(r, 25000));
      }
      await new Promise(r => setTimeout(r, 500));
      res = await fetch(ansUrl, { headers });
    }

    if (!res.ok) return {};
    const json = await res.json();
    const rawData = json.data?.answers || json.data || {};
    const map = {};
    if (Array.isArray(rawData)) {
      for (const a of rawData) {
        const qid = a.questionId || a._id || a.id;
        if (qid) map[qid] = a;
      }
    } else if (typeof rawData === 'object' && rawData !== null) {
      for (const [qid, a] of Object.entries(rawData)) {
        map[qid] = a;
      }
    }
    return map;
  } catch (e) {
    return {};
  }
}

async function repairTestFile(filePath, force = false) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const doc = JSON.parse(raw);
    const testId = doc.id || doc.testId;

    if (!testId || testId.length < 15) {
      return { skipped: true, reason: 'Invalid testId' };
    }

    let questions = doc.questions;
    if (!questions || questions.length === 0) {
      if (doc.sections) {
        questions = [];
        for (const s of doc.sections) {
          if (s.questions) questions.push(...s.questions);
        }
      } else {
        questions = [];
      }
    }
    const currentSolCount = questions.filter(q => q.solutionHtml || q.explanation).length;

    // If already 90%+ enriched and not forcing, skip
    if (!force && questions.length > 0 && currentSolCount / questions.length > 0.9) {
      return { skipped: true, reason: 'Already has solutions' };
    }

    console.log(`\n🔄 Enriching: [${path.basename(filePath)}] (Current solutions: ${currentSolCount}/${questions.length})`);

    // Fetch live test from Testbook
    const testRes = await fetch(`https://api.testbook.com/api/v2/tests/${testId}`, { headers });
    if (!testRes.ok) {
      console.log(`   ⚠️ Failed to fetch test ${testId}: HTTP ${testRes.status}`);
      return { error: `HTTP ${testRes.status}` };
    }

    const testJson = await testRes.json();
    const testData = testJson.data?.test || testJson.data || {};
    const answersMap = await fetchAnswers(testId);

    // Build raw question lookup by ID
    const rawQMap = {};
    for (const sec of (testData.sections || [])) {
      for (const q of (sec.questions || [])) {
        const qid = q._id || q.id;
        if (qid) rawQMap[qid] = q;
      }
    }

    let enrichedSolCount = 0;
    let enrichedDirCount = 0;

    for (const q of questions) {
      const qid = q.id || q._id;
      const rawQ = rawQMap[qid] || {};
      const ansObj = answersMap[qid] || {};

      // 1. Enrich Direction / Passage / Comprehension
      let direction = q.direction || "";
      if (!direction) {
        if (rawQ.en && rawQ.en.comp) {
          direction = cleanHtml(typeof rawQ.en.comp === 'object' ? (rawQ.en.comp.value || rawQ.en.comp.en || "") : rawQ.en.comp);
        } else if (rawQ.comp) {
          direction = cleanHtml(typeof rawQ.comp === 'object' ? (rawQ.comp.value || rawQ.comp.en || "") : rawQ.comp);
        } else if (rawQ.hn && rawQ.hn.comp) {
          direction = cleanHtml(typeof rawQ.hn.comp === 'object' ? (rawQ.hn.comp.value || rawQ.hn.comp.hn || "") : rawQ.hn.comp);
        } else if (rawQ.direction) {
          direction = typeof rawQ.direction === 'object' ? cleanHtml(rawQ.direction.value || rawQ.direction.en || "") : cleanHtml(rawQ.direction);
        } else if (rawQ.passage) {
          direction = typeof rawQ.passage === 'object' ? cleanHtml(rawQ.passage.value || rawQ.passage.en || "") : cleanHtml(rawQ.passage);
        } else if (rawQ.precondition) {
          direction = typeof rawQ.precondition === 'object' ? cleanHtml(rawQ.precondition.value || rawQ.precondition.en || "") : cleanHtml(rawQ.precondition);
        } else if (rawQ.en && typeof rawQ.en === 'object') {
          if (rawQ.en.direction) direction = cleanHtml(rawQ.en.direction.value || rawQ.en.direction);
          else if (rawQ.en.passage) direction = cleanHtml(rawQ.en.passage.value || rawQ.en.passage);
          else if (rawQ.en.precondition) direction = cleanHtml(rawQ.en.precondition.value || rawQ.en.precondition);
        }
      }
      if (direction) {
        q.direction = direction;
        enrichedDirCount++;
      }

      // 2. Enrich Solution HTML
      let solution = "";
      if (ansObj.sol && ansObj.sol.en && ansObj.sol.en.value) {
        solution = cleanHtml(ansObj.sol.en.value);
      } else if (ansObj.sol && typeof ansObj.sol.en === 'string') {
        solution = cleanHtml(ansObj.sol.en);
      } else if (ansObj.solution && ansObj.solution.en && ansObj.solution.en.value) {
        solution = cleanHtml(ansObj.solution.en.value);
      } else if (ansObj.solution && typeof ansObj.solution === 'string') {
        solution = cleanHtml(ansObj.solution);
      } else if (ansObj.explanation) {
        solution = cleanHtml(typeof ansObj.explanation === 'object' ? (ansObj.explanation.value || ansObj.explanation.en || "") : ansObj.explanation);
      } else if (rawQ.en && rawQ.en.solution) {
        solution = cleanHtml(rawQ.en.solution.value || rawQ.en.solution);
      } else if (rawQ.solution) {
        solution = cleanHtml(typeof rawQ.solution === 'object' ? (rawQ.solution.value || rawQ.solution.en || "") : rawQ.solution);
      }

      if (solution) {
        q.solutionHtml = solution;
        q.explanation = solution;
        enrichedSolCount++;
      }

      // 3. Enrich Correct Answer Key
      let correctIdx = undefined;
      if (ansObj.correctOption !== undefined) {
        correctIdx = ansObj.correctOption;
      } else if (ansObj.answer !== undefined) {
        correctIdx = ansObj.answer;
      } else if (ansObj.ans !== undefined) {
        correctIdx = ansObj.ans;
      }
      if (correctIdx !== undefined) {
        q.correctOptionIndex = correctIdx;
        q.correctOptionId = String(correctIdx);
      }
    }

    doc.solutionsCount = enrichedSolCount;
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), 'utf8');
    console.log(`   ✅ Success! Injected ${enrichedDirCount} directions & ${enrichedSolCount}/${questions.length} solutions.`);
    return { success: true, enrichedSolCount, enrichedDirCount };
  } catch (err) {
    console.error(`   ❌ Error repairing ${filePath}:`, err.message);
    return { error: err.message };
  }
}

async function main() {
  const targetCategory = process.argv[2] || "Banking";
  const force = process.argv.includes('--force');

  console.log(`\n======================================================`);
  console.log(`🚀 CBT EXAM ENRICHMENT & REPAIR ENGINE 2026`);
  console.log(`Target Category: ${targetCategory}`);
  console.log(`Force Overwrite: ${force}`);
  console.log(`======================================================\n`);

  let filesToProcess = [];

  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      if (item.startsWith('.')) continue;
      const full = path.join(dir, item);
      const st = fs.statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (item.endsWith('.json') && !item.startsWith('._')) {
        filesToProcess.push(full);
      }
    }
  }

  if (targetCategory.toLowerCase() === 'all') {
    walk(VAULT_BASE);
  } else {
    let targetPath = path.resolve(VAULT_BASE, targetCategory);
    if (!fs.existsSync(targetPath)) {
      targetPath = path.resolve(targetCategory);
    }
    if (!fs.existsSync(targetPath)) {
      console.error(`Directory or file not found: ${targetPath}`);
      process.exit(1);
    }
    if (fs.statSync(targetPath).isDirectory()) {
      walk(targetPath);
    } else {
      filesToProcess.push(targetPath);
    }
  }

  console.log(`Found ${filesToProcess.length} test files to evaluate.`);

  let processed = 0;
  let enriched = 0;

  for (const fp of filesToProcess) {
    processed++;
    process.stdout.write(`[${processed}/${filesToProcess.length}] `);
    const res = await repairTestFile(fp, force);
    if (res.success && res.enrichedSolCount > 0) enriched++;
    
    // Tactical human-like jitter delay (2.2s - 3.2s)
    const delay = Math.floor(Math.random() * 1000) + 2200;
    await new Promise(r => setTimeout(r, delay));

    // Tactical cooldown every 40 tests to reset rolling window velocity
    if (processed % 40 === 0 && processed < filesToProcess.length) {
      console.log(`\n⏳ Taking a tactical 20-second cooldown to keep account velocity 100% safe...`);
      await new Promise(r => setTimeout(r, 20000));
    }
  }

  console.log(`\n🎉 Repair batch complete! Processed: ${processed}, Enriched: ${enriched}`);
}

main();
