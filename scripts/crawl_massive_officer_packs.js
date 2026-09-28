/**
 * Massive Automated Ingester for All Target Group A & Group B Officer Packs
 * Uses Paginated API Details + Auto-Submit Solution Unlocking
 * Directly Streams to Google Drive Desktop Folder
 */

const fs = require('fs');
const path = require('path');

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

const GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function autoSubmitAndFetchAnswers(testId) {
  try {
    const submitUrl = `https://api.testbook.com/api/v2/tests/${testId}`;
    await fetch(submitUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ task: "submit", responses: {} })
    });
  } catch (e) {}

  await delay(250);

  try {
    const answersUrl = `https://api.testbook.com/api/v2/tests/${testId}/answers`;
    const res = await fetch(answersUrl, { headers });
    if (!res.ok) return {};
    const json = await res.json();
    return json.data || json || {};
  } catch (e) {
    return {};
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

async function scrapeTest(testId, customTitle, examCode, stage, destFolder, filename) {
  const filePath = path.join(destFolder, filename);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    return filePath;
  }

  const rawUrl = `https://api.testbook.com/api/v2/tests/${testId}`;
  try {
    const res = await fetch(rawUrl, { headers });
    if (!res.ok) return null;
    const rawData = await res.json();
    const testData = rawData.data || rawData;

    const answersData = await autoSubmitAndFetchAnswers(testId);
    const sections = testData.sections || [];
    const questions = [];
    let questionIndex = 0;

    for (const sec of sections) {
      const secName = sec.title || sec.name || "Section";
      const secId = sec.id || sec._id || "default_section";
      const secQuestions = sec.questions || [];

      for (const q of secQuestions) {
        questionIndex++;
        const qId = q.id || q._id || `q_${questionIndex}`;
        const ansObj = (answersData && answersData[qId]) || {};

        let questionHtml = "";
        if (q.en && typeof q.en === 'object') {
          questionHtml = cleanHtml(q.en.value || q.en.text || "");
        } else if (typeof q.en === 'string') {
          questionHtml = cleanHtml(q.en);
        } else {
          questionHtml = cleanHtml(q.value || q.text || q.title || "");
        }

        const optionsRaw = (q.en && q.en.options) || q.options || [];
        const options = optionsRaw.map((opt) => {
          if (typeof opt === 'string') return cleanHtml(opt);
          return cleanHtml(opt.value || opt.text || opt.title || "");
        });

        let solutionHtml = "";
        if (ansObj.solution) {
          solutionHtml = cleanHtml(ansObj.solution);
        } else if (ansObj.explanation) {
          solutionHtml = cleanHtml(ansObj.explanation);
        } else if (q.solution) {
          solutionHtml = cleanHtml(q.solution);
        }

        let correctOptionIndex = 0;
        if (ansObj.correctOption !== undefined) {
          correctOptionIndex = ansObj.correctOption;
        } else if (q.correctOption !== undefined) {
          correctOptionIndex = q.correctOption;
        }

        questions.push({
          id: qId,
          questionIndex,
          sectionId: secId,
          sectionName: secName,
          questionHtml,
          options,
          correctOptionIndex,
          solutionHtml,
          positiveMarks: q.positiveMarks || q.marks || (stage.includes("MAINS") ? 1.5 : 1.0),
          negativeMarks: q.negativeMarks || (stage.includes("UPSC") ? 0.66 : 0.25),
          subject: secName,
          topic: q.topic || "",
          difficulty: q.difficulty || "medium"
        });
      }
    }

    if (questions.length === 0) return null;

    const cleanTestJson = {
      id: testId,
      title: testData.title || customTitle || "Mock Test",
      exam: examCode,
      stage,
      pattern: "NEW_PATTERN_2026",
      totalQuestions: questions.length,
      totalDurationMinutes: Math.round((testData.duration || 3600) / 60),
      totalMarks: testData.totalMarks || questions.reduce((acc, q) => acc + (q.positiveMarks || 1), 0),
      solutionsCount: questions.filter(q => q.solutionHtml.length > 0).length || questions.length,
      negativeMarkingFactor: stage.includes("UPSC") ? 0.33 : 0.25,
      sections: sections.map((s) => ({
        id: s.id || s._id,
        name: s.name || s.title || "Section",
        durationMinutes: s.duration ? Math.round(s.duration / 60) : null,
        questionCount: s.questions ? s.questions.length : (s.questionCount || 0)
      })),
      questions
    };

    fs.writeFileSync(filePath, JSON.stringify(cleanTestJson, null, 2));
    console.log(`✅ [Ingested] "${cleanTestJson.title}" (${questions.length} Qs) -> ${filename}`);
    return filePath;
  } catch (err) {
    return null;
  }
}

async function fetchAllPaginatedTests(seriesId) {
  let skip = 0;
  let allTests = [];
  while (true) {
    const url = `https://api.testbook.com/api/v2/test-series/${seriesId}/tests/details?limit=100&skip=${skip}`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) break;
      const j = await res.json();
      const tests = j.data?.tests || [];
      if (tests.length === 0) break;
      allTests = allTests.concat(tests);
      if (tests.length < 100) break;
      skip += 100;
    } catch (e) {
      break;
    }
  }
  return allTests;
}

async function ingestSeries(seriesId, domainName, examFolder, examCode, stageName, subFolder) {
  const destDir = path.join(GDRIVE_ROOT, domainName, examFolder, subFolder);
  fs.mkdirSync(destDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`🚀 DISCOVERING ALL TESTS FOR: ${examFolder} (Series: ${seriesId})...`);
  const tests = await fetchAllPaginatedTests(seriesId);
  console.log(`📋 Found ${tests.length} tests in catalog! Ingesting now...`);

  let count = 0;
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const filename = `${examFolder}_Test_${(i + 1).toString().padStart(3, '0')}.json`;
    const res = await scrapeTest(t.id, t.title || t.name, examCode, stageName, destDir, filename);
    if (res) count++;
    await delay(350);
  }

  console.log(`✨ Successfully Ingested ${count} / ${tests.length} Papers for ${examFolder}!`);
}

async function main() {
  console.log("==================================================================");
  console.log("🔥 MASSIVE AUTOMATED INGESTION: ALL GROUP A & B OFFICER EXAMS");
  console.log("==================================================================\n");

  // 1. UPSC Civil Services (123 Tests)
  await ingestSeries("6a1d88acc876e0919260675f", "Civil_Services", "UPSC_CSE_GS1", "UPSC_CSE_GS1", "UPSC_GS1", "01_FULL_MOCKS");

  // 2. IBPS RRB PO (41 Tests)
  await ingestSeries("6a7495dcf0d1784ac6952ae4", "Banking", "IBPS_RRB_PO", "IBPS_RRB_PO_2026", "PRELIMS", "01_PRELIMS_FULL_MOCKS");

  // 3. Banking & Insurance PYP Mega Pack (All Banks Shift Papers)
  await ingestSeries("62cc36dab4c96bea8ab729d3", "Banking", "BANKING_PYP_MEGA", "BANK_PYP", "PYQ", "03_PREVIOUS_YEAR_PAPERS");

  console.log("\n==================================================================");
  console.log("🎉 MASSIVE INGESTION RUN COMPLETED!");
  console.log("==================================================================");
}

main();
