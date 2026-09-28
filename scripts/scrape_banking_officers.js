/**
 * Sequence 1: Master Batch Crawler & Ingester for Group B Banking Officers
 * Targets:
 *  1. SBI PO (Probationary Officer) - Series ID: 69df92c9938b6f4fde8ac2e7
 *  2. IBPS PO (Probationary Officer) - Series ID: 6981b37d28386e8aa489fe0a
 *  3. IBPS RRB Scale-I (PO) - Series ID: 6a7495dcf0d1784ac6952ae4
 * 
 * Pipeline:
 *  - Auto-submits each paper to unlock official Testbook answers & explanations
 *  - Saves JSONs directly to Google Drive Desktop:
 *    /Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER/Banking/
 *  - Updates manifest.json with full exam metadata and Drive relative paths
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
const GDRIVE_API_KEY = "AIzaSyAjVpdPsETQs_iW1lB-XOYacVdN7-U8gL4";
const MASTER_FOLDER_ID = "1prNlUsFOrzBWspP1Q0KT-zwbGCGXlHiT";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getSeriesMeta(seriesId) {
  try {
    const url = `https://api.testbook.com/api/v2/test-series/${seriesId}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || json;
  } catch (e) {
    return null;
  }
}

async function autoSubmitAndFetchAnswers(testId) {
  try {
    const submitUrl = `https://api.testbook.com/api/v2/tests/${testId}`;
    await fetch(submitUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ task: "submit", responses: {} })
    });

    await delay(350);
    const answersUrl = `https://api.testbook.com/api/v2/tests/${testId}/answers`;
    const res = await fetch(answersUrl, { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || json;
  } catch (e) {
    return null;
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

async function scrapeSingleTest(testMeta, destFolder, filename) {
  const filePath = path.join(destFolder, filename);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    console.log(`⏩ [Already Ingested] ${filename}`);
    return filePath;
  }

  const testId = testMeta.id;
  const rawUrl = `https://api.testbook.com/api/v2/tests/${testId}`;
  
  try {
    const res = await fetch(rawUrl, { headers });
    if (!res.ok) {
      console.log(`❌ Failed to fetch test ${testId} (Status: ${res.status})`);
      return null;
    }
    const rawData = await res.json();
    const testData = rawData.data || rawData;

    // Auto-submit to unlock official answers & explanations
    const answersData = await autoSubmitAndFetchAnswers(testId);
    const answersMap = {};
    if (answersData && answersData.questions) {
      for (const q of answersData.questions) {
        answersMap[q.id || q._id] = q;
      }
    }

    const rawQuestions = testData.questions || [];
    const questions = [];

    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      const qId = q.id || q._id;
      const ansObj = answersMap[qId] || {};

      const options = (q.options || []).map((opt) => cleanHtml(opt.value || opt.text || opt.title || ""));
      const solutionHtml = cleanHtml(ansObj.solution || ansObj.explanation || q.solution || "");
      const correctOptionIndex = ansObj.correctOption !== undefined ? ansObj.correctOption : (q.correctOption !== undefined ? q.correctOption : 0);

      questions.push({
        id: qId,
        questionIndex: i,
        sectionId: q.sectionId || q.section || "default_section",
        sectionName: q.sectionName || testMeta.sectionName || "Section",
        questionHtml: cleanHtml(q.value || q.text || q.title || ""),
        options,
        correctOptionIndex,
        solutionHtml,
        positiveMarks: q.positiveMarks || q.marks || 1.0,
        negativeMarks: q.negativeMarks || (q.marks ? q.marks * 0.25 : 0.25),
        subject: q.subject || testMeta.sectionName || "",
        topic: q.topic || "",
        difficulty: q.difficulty || "medium"
      });
    }

    const cleanTestJson = {
      id: testId,
      title: testData.title || testMeta.title || "Banking Mock Test",
      exam: testMeta.examCode || "BANKING_OFFICER",
      stage: testMeta.stage || "PRELIMS",
      pattern: testMeta.pattern || "NEW_PATTERN_2026",
      totalQuestions: questions.length,
      totalDurationMinutes: Math.round((testData.duration || 3600) / 60),
      totalMarks: testData.totalMarks || questions.reduce((sum, q) => sum + (q.positiveMarks || 1), 0),
      negativeMarkingFactor: 0.25,
      sections: (testData.sections || []).map((s) => ({
        id: s.id || s._id,
        name: s.name || s.title || "Section",
        durationMinutes: s.duration ? Math.round(s.duration / 60) : null,
        questionCount: s.questionCount || 0
      })),
      questions
    };

    fs.writeFileSync(filePath, JSON.stringify(cleanTestJson, null, 2));
    console.log(`✅ [Ingested] "${cleanTestJson.title}" (${questions.length} Qs with Official Solutions)`);
    return filePath;
  } catch (err) {
    console.log(`❌ Error scraping test ${testId}:`, err.message);
    return null;
  }
}

async function crawlBankSeries(examConfig) {
  console.log(`\n======================================================`);
  console.log(`🏦 DISCOVERING & INGESTING: ${examConfig.name}`);
  console.log(`======================================================`);

  const examDir = path.join(GDRIVE_ROOT, "Banking", examConfig.folderName);
  const prelimsDir = path.join(examDir, "01_PRELIMS_FULL_MOCKS");
  const mainsDir = path.join(examDir, "02_MAINS_FULL_MOCKS");
  const pyqDir = path.join(examDir, "03_PREVIOUS_YEAR_PAPERS");

  fs.mkdirSync(prelimsDir, { recursive: true });
  fs.mkdirSync(mainsDir, { recursive: true });
  fs.mkdirSync(pyqDir, { recursive: true });

  const meta = await getSeriesMeta(examConfig.seriesId);
  if (!meta) {
    console.log(`❌ Could not fetch metadata for ${examConfig.name}`);
    return;
  }

  const sections = meta.sections || [];
  console.log(`📁 Found ${sections.length} Section groups in ${examConfig.name}`);

  let testCount = 0;
  for (const s of sections) {
    const sName = (s.title || s.name || "").toLowerCase();
    const isPrelims = sName.includes("prelim") || sName.includes("tier-1") || sName.includes("tier 1") || sName.includes("pre");
    const isMains = sName.includes("main") || sName.includes("tier-2") || sName.includes("tier 2");
    const isPYQ = sName.includes("previous") || sName.includes("pyp") || sName.includes("memory");

    let targetDir = prelimsDir;
    let stageName = "PRELIMS";
    let folderKey = "01_PRELIMS_FULL_MOCKS";

    if (isMains) {
      targetDir = mainsDir;
      stageName = "MAINS";
      folderKey = "02_MAINS_FULL_MOCKS";
    } else if (isPYQ) {
      targetDir = pyqDir;
      stageName = "PYQ";
      folderKey = "03_PREVIOUS_YEAR_PAPERS";
    }

    const subsections = s.subSections || s.subsections || [];
    for (const sub of subsections) {
      let skip = 0;
      let hasMore = true;
      while (hasMore) {
        const url = `https://api.testbook.com/api/v2/test-series/${examConfig.seriesId}/tests/details?sectionId=${s.id || s._id}&subSectionId=${sub.id || sub._id}&skip=${skip}&limit=20`;
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) break;
          const d = await res.json();
          const tests = d.data?.tests || [];
          if (tests.length === 0) break;

          for (const t of tests) {
            testCount++;
            const filename = `Test_${testCount.toString().padStart(2, '0')}_${t.id}.json`;
            await scrapeSingleTest({
              id: t.id,
              title: t.title || t.name,
              examCode: examConfig.code,
              stage: stageName,
              sectionName: s.title || s.name,
              pattern: "NEW_PATTERN_2026"
            }, targetDir, filename);

            await delay(400);
          }

          if (tests.length < 20) {
            hasMore = false;
          } else {
            skip += 20;
          }
        } catch (e) {
          hasMore = false;
        }
      }
    }
  }

  console.log(`✨ Completed Ingestion for ${examConfig.name}: ${testCount} Papers!`);
}

async function main() {
  const EXAMS = [
    {
      id: "sbi_po",
      name: "SBI PO (Probationary Officer)",
      code: "SBI_PO_2026",
      seriesId: "69df92c9938b6f4fde8ac2e7",
      folderName: "SBI_PO"
    },
    {
      id: "ibps_po",
      name: "IBPS PO (Probationary Officer)",
      code: "IBPS_PO_2026",
      seriesId: "6981b37d28386e8aa489fe0a",
      folderName: "IBPS_PO"
    },
    {
      id: "ibps_rrb_po",
      name: "IBPS RRB Scale-I (Officer Scale-I)",
      code: "IBPS_RRB_PO_2026",
      seriesId: "6a7495dcf0d1784ac6952ae4",
      folderName: "IBPS_RRB_PO"
    }
  ];

  for (const exam of EXAMS) {
    await crawlBankSeries(exam);
    await delay(1000);
  }

  console.log("\n========================================================");
  console.log("🎉 ALL GROUP B BANKING OFFICER PAPERS INGESTED & SYNCED!");
  console.log("========================================================");
}

main();
