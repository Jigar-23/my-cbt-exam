/**
 * Master Scraper for IBPS SO (IT Officer)
 * With Auto-Submit Unlocking Official Answers & Explanations
 * And Precise New 2026 Pattern vs Old 2025 Pattern Tagging
 */

const fs = require('fs');
const path = require('path');

// Credentials
const authJsonPath = path.join(__dirname, '..', 'testbook_auth.json');
let auth = { authorization: "", cookie: "" };
if (fs.existsSync(authJsonPath)) {
  try {
    auth = JSON.parse(fs.readFileSync(authJsonPath, 'utf8'));
  } catch (e) {}
}

const headers = {
  "Authorization": auth.authorization,
  "Cookie": auth.cookie,
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
  "Referer": "https://testbook.com/",
  "Origin": "https://testbook.com",
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*"
};

const BASE_DATA_DIR = path.join(__dirname, '..', 'data', 'group_b', 'ibps_so_it');
const ASSETS_DIR = path.join(__dirname, '..', 'data', 'assets', 'ibps_so_it');

fs.mkdirSync(path.join(BASE_DATA_DIR, 'new_pattern_2026', 'prelims'), { recursive: true });
fs.mkdirSync(path.join(BASE_DATA_DIR, 'new_pattern_2026', 'mains'), { recursive: true });
fs.mkdirSync(path.join(BASE_DATA_DIR, 'old_pattern_2025', 'prelims'), { recursive: true });
fs.mkdirSync(path.join(BASE_DATA_DIR, 'old_pattern_2025', 'mains'), { recursive: true });
fs.mkdirSync(path.join(BASE_DATA_DIR, 'sectional_and_drills'), { recursive: true });
fs.mkdirSync(ASSETS_DIR, { recursive: true });

async function downloadImage(url) {
  try {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return url;
    const filename = path.basename(new URL(url).pathname);
    const localFile = path.join(ASSETS_DIR, filename);
    if (fs.existsSync(localFile)) {
      return `assets/ibps_so_it/${filename}`;
    }
    const res = await fetch(url);
    if (!res.ok) return url;
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(localFile, Buffer.from(arrayBuffer));
    return `assets/ibps_so_it/${filename}`;
  } catch (e) {
    return url;
  }
}

function cleanHtml(str) {
  if (!str) return "";
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

async function fetchTestPaper(testId) {
  const url = `https://api.testbook.com/api/v2/tests/${testId}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.success || !json.data) return null;
  return json.data;
}

async function autoSubmitAndFetchAnswers(testId) {
  try {
    // 1. Submit test to unlock answers
    const submitUrl = `https://api.testbook.com/api/v2/tests/${testId}`;
    const submitRes = await fetch(submitUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ task: "submit", responses: {} })
    });
    const subData = await submitRes.json();
    console.log(`   🔓 Submit Status: ${submitRes.status} (${subData.message || 'OK'})`);

    // 2. Fetch answers
    const answersUrl = `https://api.testbook.com/api/v2/tests/${testId}/answers`;
    const res = await fetch(answersUrl, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || json;
  } catch (e) {
    console.error(`   ⚠️ Could not unlock answers for ${testId}:`, e.message);
    return null;
  }
}

function classifyTest(testData) {
  const secNames = (testData.sections || []).map(s => s.title || s.name || "");
  const totalQ = (testData.sections || []).reduce((acc, s) => acc + (s.questions ? s.questions.length : 0), 0);
  const durationMins = Math.round((testData.duration || 0) / 60);

  const hasIT = secNames.some(s => s.toLowerCase().includes("professional") || s.toLowerCase().includes("it"));
  const hasQuant = secNames.some(s => s.toLowerCase().includes("quant") || s.toLowerCase().includes("math"));
  const hasGA = secNames.some(s => s.toLowerCase().includes("general awareness") || s.toLowerCase().includes("banking"));

  let pattern = "UNKNOWN";
  let stage = "PRACTICE";
  let folder = "sectional_and_drills";
  let hasITInPrelims = false;

  if (totalQ === 100 && hasIT && hasQuant) {
    // Official New 2026 Pattern Prelims
    pattern = "NEW_PATTERN_2026";
    stage = "PRELIMS";
    hasITInPrelims = true;
    folder = "new_pattern_2026/prelims";
  } else if (totalQ === 150 && hasIT && hasQuant) {
    // Official New 2026 Pattern Mains (Objective)
    pattern = "NEW_PATTERN_2026";
    stage = "MAINS";
    folder = "new_pattern_2026/mains";
  } else if (totalQ >= 50 && totalQ <= 60 && hasIT && !hasQuant) {
    // Pure IT Specialist Mains
    pattern = "MAINS_IT_SPECIALIST";
    stage = "MAINS";
    folder = "new_pattern_2026/mains";
  } else if (totalQ === 150 && !hasIT && hasGA) {
    // Legacy Old 2025 Pattern Prelims (No IT in Prelims)
    pattern = "OLD_PATTERN_2025";
    stage = "PRELIMS";
    hasITInPrelims = false;
    folder = "old_pattern_2025/prelims";
  } else if (testData.sections && testData.sections.length === 1 && hasIT) {
    pattern = "MAINS_IT_SECTIONAL";
    stage = "MAINS";
    folder = "sectional_and_drills";
  } else {
    pattern = "TOPIC_DRILL";
    stage = "PRACTICE";
    folder = "sectional_and_drills";
  }

  return { pattern, stage, folder, hasITInPrelims, totalQ, durationMins };
}

async function scrapeAndSaveTest(testId) {
  console.log(`\n-----------------------------------------------------------`);
  console.log(`📡 Fetching Paper for Test ID: ${testId} ...`);

  const rawData = await fetchTestPaper(testId);
  if (!rawData) {
    console.error(`❌ Could not fetch test data for ${testId}`);
    return false;
  }

  const classification = classifyTest(rawData);
  console.log(`   🏷️ Classified as: [${classification.pattern}] (${classification.stage})`);
  
  // Auto-submit and fetch official answers
  const answersData = await autoSubmitAndFetchAnswers(testId);

  let totalQuestionsCount = 0;
  let downloadedImagesCount = 0;
  let solutionsFoundCount = 0;

  const parsedSections = [];
  for (const s of (rawData.sections || [])) {
    const parsedQuestions = [];
    const isITSection = (s.title || "").toLowerCase().includes("professional") || (s.title || "").toLowerCase().includes("it");

    for (const q of (s.questions || [])) {
      totalQuestionsCount++;
      const ansObj = (answersData && answersData[q._id]) ? answersData[q._id] : {};

      // Text (English)
      let qText = "";
      if (q.en && typeof q.en === 'object') {
        qText = cleanHtml(q.en.value || "");
      } else if (typeof q.en === 'string') {
        qText = cleanHtml(q.en);
      }

      // Diagram/Image
      let localImage = null;
      const rawImg = q.image || q.imageUrl || (q.en && q.en.image);
      if (rawImg) {
        localImage = await downloadImage(rawImg);
        if (localImage.startsWith('assets/')) downloadedImagesCount++;
      }

      // Options
      const optionsRaw = (q.en && q.en.options) || q.options || [];
      const parsedOptions = [];
      let optIdx = 0;
      for (const opt of optionsRaw) {
        let optText = cleanHtml(opt.value || opt.text || (typeof opt === 'string' ? opt : ''));
        let optImg = null;
        if (opt.image) {
          optImg = await downloadImage(opt.image);
        }
        parsedOptions.push({
          id: opt.prompt || opt._id || `opt_${optIdx + 1}`,
          label: opt.prompt || `${optIdx + 1}`,
          text: optText,
          image: optImg
        });
        optIdx++;
      }

      // Correct Option & Explanation from Testbook Answers
      let correctOpt = ansObj.correctOption || ansObj.answer || q.correctOption;
      if (correctOpt === undefined && ansObj.ans !== undefined) {
        correctOpt = `${ansObj.ans}`;
      }

      let explanationText = "";
      if (ansObj.sol && ansObj.sol.en && ansObj.sol.en.value) {
        explanationText = cleanHtml(ansObj.sol.en.value);
      } else if (ansObj.explanation) {
        explanationText = cleanHtml(ansObj.explanation);
      } else if (q.en && q.en.solution) {
        explanationText = cleanHtml(q.en.solution);
      }

      if (correctOpt || explanationText) {
        solutionsFoundCount++;
      }

      // Marks calculation
      // Under New 2026 Pattern: IT questions carry 2.0 marks (+2 / -0.5)
      let posMarks = q.posMarks || 1.0;
      let negMarks = q.negMarks || 0.25;
      if (isITSection && classification.pattern.includes("NEW_PATTERN_2026")) {
        posMarks = 2.0;
        negMarks = 0.50;
      }

      let directionText = "";
      if (q.direction) {
        directionText = typeof q.direction === 'object' ? cleanHtml(q.direction.value || q.direction.en || "") : cleanHtml(q.direction);
      } else if (q.passage) {
        directionText = typeof q.passage === 'object' ? cleanHtml(q.passage.value || q.passage.en || "") : cleanHtml(q.passage);
      } else if (q.precondition) {
        directionText = typeof q.precondition === 'object' ? cleanHtml(q.precondition.value || q.precondition.en || "") : cleanHtml(q.precondition);
      } else if (q.en && typeof q.en === 'object') {
        if (q.en.direction) directionText = cleanHtml(q.en.direction.value || q.en.direction);
        else if (q.en.passage) directionText = cleanHtml(q.en.passage.value || q.en.passage);
        else if (q.en.precondition) directionText = cleanHtml(q.en.precondition.value || q.en.precondition);
      }

      parsedQuestions.push({
        id: q._id || `q_${totalQuestionsCount}`,
        questionNumber: totalQuestionsCount,
        type: q.type || "mcq_single",
        text: qText,
        direction: directionText || undefined,
        passage: q.passage ? (typeof q.passage === 'string' ? cleanHtml(q.passage) : undefined) : undefined,
        image: localImage,
        options: parsedOptions,
        correctOptionId: correctOpt || null,
        marks: posMarks,
        negativeMarks: negMarks,
        explanation: explanationText || "Official explanation pending attempt sync.",
        topic: q.topic || s.title,
        topperAvgTimeSec: ansObj.topperAvgTime || undefined,
        communityAccuracyPct: ansObj.accuracy || undefined
      });
    }

    parsedSections.push({
      id: s._id || s.id || `sec_${parsedSections.length + 1}`,
      name: s.title || s.name || "Section",
      durationMinutes: s.time ? Math.round(s.time / 60) : 20,
      maxMarks: s.maxM || (parsedQuestions.reduce((sum, q) => sum + q.marks, 0)),
      isProfessionalIT: isITSection,
      questions: parsedQuestions
    });
  }

  const finalTestJson = {
    testId: testId,
    title: rawData.title,
    exam: "IBPS SO IT Officer",
    pattern: classification.pattern,
    stage: classification.stage,
    hasITInPrelims: classification.hasITInPrelims,
    totalQuestions: totalQuestionsCount,
    totalDurationMinutes: classification.durationMins,
    totalMarks: rawData.totalMarks || parsedSections.reduce((sum, s) => sum + s.maxMarks, 0),
    sections: parsedSections,
    metadata: {
      scrapedAt: new Date().toISOString(),
      imagesPreserved: downloadedImagesCount,
      answersIncluded: solutionsFoundCount > 0,
      solutionsCount: solutionsFoundCount
    }
  };

  const safeFilename = `${classification.pattern.toLowerCase()}_${testId}.json`;
  const targetPath = path.join(BASE_DATA_DIR, classification.folder, safeFilename);
  fs.writeFileSync(targetPath, JSON.stringify(finalTestJson, null, 2), 'utf8');

  console.log(`✅ Successfully Saved Test!`);
  console.log(`   • Title: "${rawData.title}"`);
  console.log(`   • Questions: ${totalQuestionsCount} | Solutions Extracted: ${solutionsFoundCount}/${totalQuestionsCount}`);
  console.log(`   • Saved To: ${targetPath}`);
  return true;
}

async function runBatchScraper() {
  console.log(`===========================================================`);
  console.log(`🚀 Starting IBPS SO (IT Officer) Automated Batch Extractor`);
  console.log(`   (With Auto-Submit to Unlock Native Testbook Solutions)`);
  console.log(`===========================================================`);

  const targetTestIds = [
    "6a7c2510ed16f72d85b07229", // Ultimate Mega Live Test (New Pattern 2026 with 25 IT Qs @ 50M)
    "6a0f4515445f1981ffd27bda", // Sectional GA Test
    "6a7c25218da956df954be4f6", // AFO Live Test
    "6a7c251b7b3934d412f32297"  // HR Live Test
  ];

  const discoveredPath = path.join(__dirname, '..', 'data', 'ibps_so_discovered_tests.json');
  if (fs.existsSync(discoveredPath)) {
    try {
      const disc = JSON.parse(fs.readFileSync(discoveredPath, 'utf8'));
      for (const t of disc) {
        if (t.id && !targetTestIds.includes(t.id)) targetTestIds.push(t.id);
      }
    } catch (e) {}
  }

  console.log(`📋 Total Tests in Queue: ${targetTestIds.length}`);

  let successCount = 0;
  for (const tid of targetTestIds) {
    const ok = await scrapeAndSaveTest(tid);
    if (ok) successCount++;
    // Safe delay
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log(`\n🎉 ===========================================================`);
  console.log(`✅ Batch Ingestion Completed! Total Saved: ${successCount}/${targetTestIds.length}`);
  console.log(`===========================================================\n`);
}

if (require.main === module) {
  runBatchScraper();
}

module.exports = { scrapeAndSaveTest, runBatchScraper };
