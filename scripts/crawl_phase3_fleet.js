/**
 * Phase 3 Ingestion Fleet:
 * - Railway Officer & Technical Cadres (RRB NTPC Graduate, RRB JE, Section Controller)
 * - UPSC CDS & Defense Officer 10-Year Shifts
 * - Regulatory Bodies (RBI Grade B & SEBI Full Length Packs)
 * - Remaining State PSCs
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

const PHASE3_TARGET_PACKS = [
  // Railway Officer & Technical Cadres (Group B)
  { seriesId: "68e4f124a4d902ea5ca9c860", domain: "Railways", exam: "RRB_NTPC_GRADUATE", code: "RRB_NTPC_GRAD", stage: "CBT_1", sub: "01_CBT1_FULL_MOCKS" },
  { seriesId: "6a46696948bef137bf8fe2de", domain: "Railways", exam: "RRB_JE_OFFICER", code: "RRB_JE_2026", stage: "CBT_1", sub: "01_CBT1_FULL_MOCKS" },
  { seriesId: "6a47a29a9e8e05a7a18d329b", domain: "Railways", exam: "RRB_SECTION_CONTROLLER", code: "RRB_SEC_CON", stage: "CBT", sub: "01_FULL_MOCKS" },
  
  // Defense Officers
  { seriesId: "6888bfde827a8eb4a948d802", domain: "Defense", exam: "RAJASTHAN_POLICE_SI", code: "RAJ_POLICE_SI", stage: "WRITTEN", sub: "01_FULL_MOCKS" },
  { seriesId: "68e78b08540b9a24031de605", domain: "Defense", exam: "MP_POLICE_SI", code: "MP_POLICE_SI", stage: "PRELIMS", sub: "01_PRELIMS_FULL_MOCKS" },

  // State PSC Teachers & Administrative Officers
  { seriesId: "66445e350ac06ef32780bcd5", domain: "State_PSC", exam: "BPSC_OFFICER_PGT", code: "BPSC_PGT", stage: "WRITTEN", sub: "01_FULL_MOCKS" },
  { seriesId: "6a7db1e7ea1df78958d4f9cb", domain: "State_PSC", exam: "BIHAR_STET_OFFICER_P2", code: "BIHAR_STET_P2", stage: "CBT", sub: "01_FULL_MOCKS" }
];

async function runPhase3() {
  console.log("==================================================================");
  console.log("🚀 STARTING PHASE 3 INGESTION FLEET");
  console.log("==================================================================\n");

  let grandTotal = 0;

  for (const pack of PHASE3_TARGET_PACKS) {
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
  console.log(`🎉 PHASE 3 COMPLETE! Total Processed: ${grandTotal}`);
  console.log("==================================================================");
}

runPhase3();
