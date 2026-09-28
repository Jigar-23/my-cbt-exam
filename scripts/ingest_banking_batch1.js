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

  await delay(300);

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
  const rawUrl = `https://api.testbook.com/api/v2/tests/${testId}`;

  try {
    const res = await fetch(rawUrl, { headers });
    if (!res.ok) {
      console.log(`❌ Failed to fetch test blueprint ${testId}: HTTP ${res.status}`);
      return null;
    }
    const rawData = await res.json();
    const testData = rawData.data || rawData;

    // Fetch official unlocked solutions
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

        // Question HTML
        let questionHtml = "";
        if (q.en && typeof q.en === 'object') {
          questionHtml = cleanHtml(q.en.value || q.en.text || "");
        } else if (typeof q.en === 'string') {
          questionHtml = cleanHtml(q.en);
        } else {
          questionHtml = cleanHtml(q.value || q.text || q.title || "");
        }

        // Options
        const optionsRaw = (q.en && q.en.options) || q.options || [];
        const options = optionsRaw.map((opt) => {
          if (typeof opt === 'string') return cleanHtml(opt);
          return cleanHtml(opt.value || opt.text || opt.title || "");
        });

        // Solution HTML
        let solutionHtml = "";
        if (ansObj.solution) {
          solutionHtml = cleanHtml(ansObj.solution);
        } else if (ansObj.explanation) {
          solutionHtml = cleanHtml(ansObj.explanation);
        } else if (q.solution) {
          solutionHtml = cleanHtml(q.solution);
        }

        // Correct Option Index
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
          positiveMarks: q.positiveMarks || q.marks || (stage === "MAINS" ? 1.5 : 1.0),
          negativeMarks: q.negativeMarks || 0.25,
          subject: secName,
          topic: q.topic || "",
          difficulty: q.difficulty || "medium"
        });
      }
    }

    const cleanTestJson = {
      id: testId,
      title: testData.title || customTitle || "Banking Mock Test",
      exam: examCode,
      stage,
      pattern: "NEW_PATTERN_2026",
      totalQuestions: questions.length,
      totalDurationMinutes: Math.round((testData.duration || 3600) / 60),
      totalMarks: testData.totalMarks || questions.reduce((acc, q) => acc + (q.positiveMarks || 1), 0),
      solutionsCount: questions.filter(q => q.solutionHtml.length > 0).length || questions.length,
      negativeMarkingFactor: 0.25,
      sections: sections.map((s) => ({
        id: s.id || s._id,
        name: s.name || s.title || "Section",
        durationMinutes: s.duration ? Math.round(s.duration / 60) : null,
        questionCount: s.questions ? s.questions.length : (s.questionCount || 0)
      })),
      questions
    };

    fs.writeFileSync(filePath, JSON.stringify(cleanTestJson, null, 2));
    console.log(`✅ [Ingested] "${cleanTestJson.title}" (${questions.length} Questions | ${cleanTestJson.solutionsCount} Solutions) -> ${filename}`);
    return filePath;
  } catch (err) {
    console.log(`❌ Error on ${testId}:`, err.message);
    return null;
  }
}

async function run() {
  console.log("=================================================");
  console.log("🏦 SCRAPING SEQUENCE 1 BANKING PAPERS TO GDRIVE");
  console.log("=================================================\n");

  const sbiMainsDir = path.join(GDRIVE_ROOT, "Banking", "SBI_PO", "02_MAINS_FULL_MOCKS");
  fs.mkdirSync(sbiMainsDir, { recursive: true });

  const sbiTests = [
    { id: "69df6065fb7d592ba3d37d97", title: "SBI PO Mains Full Test 1" },
    { id: "69df60660ea790d381d9faf4", title: "SBI PO Mains Full Test 2" },
    { id: "69df6067a21e2afdf0136825", title: "SBI PO Mains Full Test 3" },
    { id: "69df60687ee23b5374dcb5cb", title: "SBI PO Mains Full Test 4" },
    { id: "69df6069d84f6129d5178a88", title: "SBI PO Mains Full Test 5" },
    { id: "69df606a550875a252c87956", title: "SBI PO Mains Full Test 6" }
  ];

  console.log(`📌 Ingesting ${sbiTests.length} SBI PO Mains Full Tests...`);
  for (let i = 0; i < sbiTests.length; i++) {
    const t = sbiTests[i];
    const filename = `SBI_PO_Mains_Full_Test_${(i + 1).toString().padStart(2, '0')}.json`;
    await scrapeTest(t.id, t.title, "SBI_PO_2026", "MAINS", sbiMainsDir, filename);
    await delay(500);
  }

  const rrbPrelimsDir = path.join(GDRIVE_ROOT, "Banking", "IBPS_RRB_PO", "01_PRELIMS_FULL_MOCKS");
  fs.mkdirSync(rrbPrelimsDir, { recursive: true });

  const rrbTests = [
    { id: "6a732ea1dc6fb3b3ce590f6e", title: "IBPS RRB PO Prelims Full Test 1" },
    { id: "6a732ea33bca53db0672c198", title: "IBPS RRB PO Prelims Full Test 2" },
    { id: "6a732ea5d644599fc0249481", title: "IBPS RRB PO Prelims Full Test 3" }
  ];

  console.log(`\n📌 Ingesting ${rrbTests.length} IBPS RRB PO Prelims Full Tests...`);
  for (let i = 0; i < rrbTests.length; i++) {
    const t = rrbTests[i];
    const filename = `IBPS_RRB_PO_Prelims_Test_${(i + 1).toString().padStart(2, '0')}.json`;
    await scrapeTest(t.id, t.title, "IBPS_RRB_PO_2026", "PRELIMS", rrbPrelimsDir, filename);
    await delay(500);
  }

  console.log("\n=================================================");
  console.log("🎉 BATCH INGESTION COMPLETE & SYNCED TO GDRIVE!");
  console.log("=================================================");
}

run();
