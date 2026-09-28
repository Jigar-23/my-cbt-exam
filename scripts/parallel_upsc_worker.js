/**
 * Master Parallel UPSC / NCERT Fleet Runner
 * Spawns multiple parallel asynchronous workers to download all packs simultaneously.
 */

const fs = require('fs');
const path = require('path');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2Njg5YTA5ZDJkYzgxNTNmMTA0Y2M0OWMiLCJpYXQiOjE3NjM1MzM3MzEsImV4cCI6MTc2NjEyNTczMX0.x8PjD2L3Lw00BvLhK0l9E4H9UoU4EwW3E6oO0T8xZ7E";

const headers = {
  "testbook-version": "3",
  "testbook-platform": "web",
  "usertoken": token
};

const GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER";

function sanitizeFolderName(str) {
  return (str || "General")
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]/g, '')
    .trim();
}

function cleanText(raw) {
  if (!raw) return "";
  let s = String(raw).trim();
  s = s.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

function pickEnglishContent(obj) {
  if (!obj) return "";
  if (typeof obj === 'string') return cleanText(obj);
  if (typeof obj === 'object') {
    return cleanText(obj.en || obj["en-in"] || obj.hi || Object.values(obj)[0] || "");
  }
  return String(obj);
}

async function ingestSingleTest(testId, outDir, filePrefix, examCode, stage, testTitleFallback) {
  try {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const safeTitle = sanitizeFolderName(testTitleFallback || testId);
    const fileName = `${filePrefix}_${safeTitle}.json`;
    const filePath = path.join(outDir, fileName);

    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 2000) {
      return true;
    }

    const startUrl = `https://api.testbook.com/api/v2/tests/${testId}/start-test`;
    const startRes = await fetch(startUrl, { method: "POST", headers, body: JSON.stringify({}) });
    if (!startRes.ok) return false;
    const startData = await startRes.json();
    const testData = startData.data?.test || startData.data || {};
    const questionsRaw = testData.questions || [];

    if (!questionsRaw.length) return false;

    const analysisUrl = `https://api.testbook.com/api/v2/tests/${testId}/analysis`;
    let analysisQuestions = [];
    try {
      const aRes = await fetch(analysisUrl, { headers });
      if (aRes.ok) {
        const aJson = await aRes.json();
        analysisQuestions = aJson.data?.questions || aJson.data?.test?.questions || [];
      }
    } catch(e) {}

    const analysisMap = new Map();
    analysisQuestions.forEach(q => {
      const qid = q._id || q.id;
      if (qid) analysisMap.set(qid, q);
    });

    const parsedQuestions = [];
    for (let i = 0; i < questionsRaw.length; i++) {
      const q = questionsRaw[i];
      const qid = q._id || q.id || `q_${i+1}`;
      const ana = analysisMap.get(qid) || {};

      const qText = pickEnglishContent(q.question || q.title || ana.question);
      const rawOptions = q.options || ana.options || [];
      const options = rawOptions.map(opt => pickEnglishContent(opt.option || opt.title || opt));

      let correctIndex = 0;
      if (typeof ana.correctOption === 'number') correctIndex = ana.correctOption;
      else if (typeof q.correctOption === 'number') correctIndex = q.correctOption;
      else if (Array.isArray(ana.correctOptions) && ana.correctOptions.length > 0) correctIndex = ana.correctOptions[0];

      const solution = pickEnglishContent(ana.solution || q.solution || ana.explanation || q.explanation || "Official detailed solution provided in test key.");

      parsedQuestions.push({
        id: qid,
        questionNumber: i + 1,
        section: q.section || ana.section || "General Studies",
        question: qText || `Question ${i + 1}`,
        options: options.length > 0 ? options : ["Option A", "Option B", "Option C", "Option D"],
        correctOption: correctIndex,
        explanation: solution,
        positiveMarks: q.positiveMarks || 2.0,
        negativeMarks: q.negativeMarks || 0.66
      });
    }

    const fullCleanJson = {
      testId: testId,
      title: testData.title || testTitleFallback || "UPSC / NCERT Examination",
      examCode: examCode,
      stage: stage,
      durationMinutes: testData.duration || 120,
      totalQuestions: parsedQuestions.length,
      totalMarks: testData.totalMarks || (parsedQuestions.length * 2),
      questions: parsedQuestions,
      extractedAt: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(fullCleanJson, null, 2));
    return true;
  } catch (err) {
    return false;
  }
}

async function exhaustSeriesPack(domain, seriesId, examName, examCode, stage) {
  const seriesUrl = `https://api.testbook.com/api/v2/test-series/${seriesId}`;
  let sections = [];
  try {
    const res = await fetch(seriesUrl, { headers });
    if (res.ok) {
      const j = await res.json();
      sections = j.data?.details?.sections || j.data?.sections || [];
    }
  } catch (e) {}

  let totalSeriesIngested = 0;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const secName = sec.name || `Section_${sIdx + 1}`;
    const subSections = sec.subsections || sec.subSections || [{ id: sec.id, name: secName }];

    for (let subIdx = 0; subIdx < subSections.length; subIdx++) {
      const sub = subSections[subIdx];
      const subName = sub.name || `Sub_${subIdx + 1}`;
      const folderSlug = `${(sIdx + 1).toString().padStart(2, '0')}_${sanitizeFolderName(secName)}_${sanitizeFolderName(subName)}`;
      const outDir = path.join(GDRIVE_ROOT, domain, examName, folderSlug);

      let skip = 0;
      let flatCount = 0;

      while (true) {
        const url = `https://api.testbook.com/api/v2/test-series/${seriesId}/tests/details?sectionId=${sec.id}&subSectionId=${sub.id}&limit=100&skip=${skip}`;
        let tests = [];
        try {
          const r = await fetch(url, { headers });
          if (r.ok) {
            const jd = await r.json();
            tests = jd.data?.tests || jd.data || [];
          }
        } catch (e) {}

        if (!Array.isArray(tests) || tests.length === 0) break;

        // Ingest test batch in parallel chunks of 5
        for (let i = 0; i < tests.length; i += 5) {
          const chunk = tests.slice(i, i + 5);
          await Promise.all(chunk.map(async (t, cIdx) => {
            if (!t.id) return;
            const prefix = `${examCode}_${(flatCount + i + cIdx + 1).toString().padStart(3, '0')}`;
            const success = await ingestSingleTest(t.id, outDir, prefix, examCode, stage, t.title);
            if (success) totalSeriesIngested++;
          }));
        }

        flatCount += tests.length;
        console.log(`  ⚡ [${domain} > ${examName}] Ingested ${flatCount} tests (Latest: "${tests[tests.length - 1]?.title}")`);

        if (tests.length < 100) break;
        skip += 100;
      }
    }
  }

  console.log(`✅ [${domain} > ${examName}] FINISHED: ${totalSeriesIngested} Tests Safely Stored!\n`);
  return totalSeriesIngested;
}

const workerNum = process.argv[2] || "all";

const WORKERS = {
  "1": [{ domain: "Civil_Services", seriesId: "68418c8d58481f2025692c19", examName: "UPSC_CSE_PRELIMS_2026", examCode: "UPSC_CSE_2026", stage: "Antim Prahar & GS Mocks" }],
  "2": [
    { domain: "Civil_Services", seriesId: "60d474a22f8bf44459e2aaa5", examName: "NCERT_FOUNDATION_GS", examCode: "NCERT_FND", stage: "History, Polity, Geo" },
    { domain: "Civil_Services", seriesId: "630c7889992a8c94f82da094", examName: "NCERT_BASED_GS", examCode: "NCERT_GS", stage: "Art, History, Governance" }
  ],
  "3": [
    { domain: "Civil_Services", seriesId: "693be0dc1be4079ba70a59ff", examName: "UPSC_BEGINNERS", examCode: "UPSC_BEG", stage: "Concept Builders & Quests" },
    { domain: "Civil_Services", seriesId: "6911e3dfefbd8407a95eaf3e", examName: "UPSC_CSAT_SERIES", examCode: "UPSC_CSAT", stage: "PYPs, Chapter & Sectionals" }
  ],
  "4": [{ domain: "Defense", seriesId: "699c28f60e7808f2357a42bc", examName: "UPSC_CAPF_AC_2026", examCode: "UPSC_CAPF", stage: "Officer GS & GMA Mocks" }],
  "5": [
    { domain: "Civil_Services", seriesId: "62277d54111e9c2e906634ca", examName: "POLITY_ALL_PSC", examCode: "POLITY_PSC", stage: "UPSC & State Level Tests" },
    { domain: "Civil_Services", seriesId: "6214a6839c797acaa405a83b", examName: "HISTORY_ALL_PSC", examCode: "HISTORY_PSC", stage: "UPSC & State Level Tests" },
    { domain: "Civil_Services", seriesId: "6343cf21ffc353a155d237bc", examName: "GEOGRAPHY_ALL_PSC", examCode: "GEO_PSC", stage: "UPSC & State Level Tests" }
  ],
  "6": [{ domain: "Civil_Services", seriesId: "6a1d88acc876e0919260675f", examName: "UPSC_CSE_PRELIMS_2027", examCode: "UPSC_CSE_2027", stage: "PrepLab & Full Mocks" }]
};

async function run() {
  const targets = WORKERS[workerNum] || Object.values(WORKERS).flat();
  console.log(`🚀 [Worker ${workerNum}] Launching Ingestion for ${targets.length} Series...`);
  
  await Promise.all(targets.map(t => exhaustSeriesPack(t.domain, t.seriesId, t.examName, t.examCode, t.stage)));
  
  console.log(`🎉 [Worker ${workerNum}] 100% FINISHED!`);
}

run();
