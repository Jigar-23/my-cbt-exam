/**
 * Phase 4 Ingestion Fleet:
 * - Banking & Insurance Mega Packs (SBI Clerk/PO, IBPS Clerk/PO, Insurance Officers)
 * - Civil Services (UPSC ESE / IES, EPFO EO/AO, CSAT Packs)
 * - Regulatory Bodies (RBI Grade B Phase 1 & 2, SEBI Grade A, NABARD)
 * - Defense Officers (CDS Full Shifts, AFCAT, CAPF)
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

  await delay(200);

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

async function scrapeSingleTest(testId, customTitle, examCode, stage, destFolder, filename) {
  const filePath = path.join(destFolder, filename);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    return true;
  }

  const rawUrl = `https://api.testbook.com/api/v2/tests/${testId}`;
  try {
    const res = await fetch(rawUrl, { headers });
    if (!res.ok) return false;
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
          positiveMarks: q.positiveMarks || q.marks || (stage.includes("UPSC") ? 2.0 : 1.0),
          negativeMarks: q.negativeMarks || (stage.includes("UPSC") ? 0.66 : 0.25),
          subject: secName,
          topic: q.topic || "",
          difficulty: q.difficulty || "medium"
        });
      }
    }

    if (questions.length === 0) return false;

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
    return true;
  } catch (err) {
    return false;
  }
}

async function fetchAllTestsInSeries(seriesId) {
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

const PHASE4_TARGET_PACKS = [
  // General Science & Railway PYP Mega Packs
  { seriesId: "65cdd01b9bcb1115afad7b58", domain: "Railways", exam: "RRB_GENERAL_SCIENCE_PYP", code: "RRB_SCI_PYP", stage: "SCIENCE_PYP", sub: "01_SCIENCE_SHIFTS" },
  { seriesId: "65cdd04b382f8bb79e4c4b65", domain: "Railways", exam: "RRB_MATHS_PYP", code: "RRB_MATH_PYP", stage: "MATHS_PYP", sub: "02_MATHS_SHIFTS" },
  { seriesId: "65cdd037c8a77dba8251e032", domain: "Railways", exam: "RRB_REASONING_PYP", code: "RRB_REAS_PYP", stage: "REASONING_PYP", sub: "03_REASONING_SHIFTS" },
  
  // Current Affairs 2026 Mega Pack (All Officer Exams)
  { seriesId: "695775734ccf9df45af31a20", domain: "Civil_Services", exam: "CURRENT_AFFAIRS_MEGA_2026", code: "CA_MEGA_2026", stage: "CURRENT_AFFAIRS", sub: "01_MONTHLY_AND_TOPIC_CA" }
];

async function runPhase4() {
  console.log("==================================================================");
  console.log("🚀 STARTING PHASE 4 INGESTION FLEET");
  console.log("==================================================================\n");

  let grandTotal = 0;

  for (const pack of PHASE4_TARGET_PACKS) {
    const destDir = path.join(GDRIVE_ROOT, pack.domain, pack.exam, pack.sub);
    fs.mkdirSync(destDir, { recursive: true });

    console.log(`\n------------------------------------------------------------`);
    console.log(`🚀 Ingesting: [${pack.domain}] ${pack.exam} (Series: ${pack.seriesId})`);
    
    const tests = await fetchAllTestsInSeries(pack.seriesId);
    console.log(`📋 Discovered ${tests.length} tests in pack!`);

    let count = 0;
    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const filename = `${pack.exam}_Test_${(i + 1).toString().padStart(3, '0')}.json`;
      const ok = await scrapeSingleTest(t.id, t.title || t.name, pack.code, pack.stage, destDir, filename);
      if (ok) {
        count++;
        grandTotal++;
      }
      await delay(250);
    }

    console.log(`✨ Pack [${pack.exam}] Finished: ${count} / ${tests.length} Tests Ready!`);
  }

  console.log("\n==================================================================");
  console.log(`🎉 PHASE 4 COMPLETE! Total Processed: ${grandTotal}`);
  console.log("==================================================================");
}

runPhase4();
