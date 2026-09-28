/**
 * Shared Core Utility for all Concurrent Exam Workers
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
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    console.log(`⏩ [Skipping] ${filename} already exists`);
    return filePath;
  }

  const rawUrl = `https://api.testbook.com/api/v2/tests/${testId}`;
  try {
    const res = await fetch(rawUrl, { headers });
    if (!res.ok) {
      console.log(`❌ Failed ${testId}: HTTP ${res.status}`);
      return null;
    }
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
          positiveMarks: q.positiveMarks || q.marks || (stage === "MAINS" ? 1.5 : 1.0),
          negativeMarks: q.negativeMarks || (stage === "UPSC_GS1" ? 0.66 : 0.25),
          subject: secName,
          topic: q.topic || "",
          difficulty: q.difficulty || "medium"
        });
      }
    }

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
      negativeMarkingFactor: stage === "UPSC_GS1" ? 0.33 : 0.25,
      sections: sections.map((s) => ({
        id: s.id || s._id,
        name: s.name || s.title || "Section",
        durationMinutes: s.duration ? Math.round(s.duration / 60) : null,
        questionCount: s.questions ? s.questions.length : (s.questionCount || 0)
      })),
      questions
    };

    fs.writeFileSync(filePath, JSON.stringify(cleanTestJson, null, 2));
    console.log(`✅ [Ingested] "${cleanTestJson.title}" (${questions.length} Qs | ${cleanTestJson.solutionsCount} Solutions) -> ${filename}`);
    return filePath;
  } catch (err) {
    console.log(`❌ Error on ${testId}:`, err.message);
    return null;
  }
}

async function discoverTestIdsFromPage(slug) {
  try {
    const res = await fetch(`https://testbook.com/${slug}/test-series`, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
    });
    const html = await res.text();
    const regex = /data-share-heading="([^"]+)"[\s\S]*?data-share-url="[^"]*\/tests\/([a-f0-9]{24})"/g;
    const list = [];
    let m;
    while ((m = regex.exec(html)) !== null) {
      if (!list.some(x => x.id === m[2])) {
        list.push({ title: m[1], id: m[2] });
      }
    }
    return list;
  } catch (e) {
    return [];
  }
}

module.exports = {
  GDRIVE_ROOT,
  delay,
  scrapeTest,
  discoverTestIdsFromPage
};
