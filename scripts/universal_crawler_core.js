/**
 * Universal Exhaustive 2-Step Ingestion Engine Core
 * NO LIMITS: Ingests 100% of all sections, subsections, and tests until cleared.
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
  "Content-Type": "application/json"
};

const GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER";

function cleanHtml(htmlStr) {
  if (!htmlStr) return "";
  let s = htmlStr;
  s = s.replace(/<span class="katex">.*?<annotation encoding="application\/x-tex">(.*?)<\/annotation>.*?<\/span>/gs, '$$$1$$');
  s = s.replace(/<span class="katex-mathml">.*?<\/span>/gs, '');
  s = s.replace(/<span class="katex-html".*?<\/span>/gs, '');
  return s.trim();
}

function sanitizeFolderName(str) {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toUpperCase();
}

async function ingestSingleTest(testId, outDir, prefix, examCode, stage, customTitle = "") {
  try {
    fs.mkdirSync(outDir, { recursive: true });
    const existing = fs.readdirSync(outDir).find(f => f.includes(testId) || f.startsWith(prefix));
    
    // Test URL
    const testUrl = `https://api.testbook.com/api/v2/tests/${testId}`;
    const testRes = await fetch(testUrl, { headers });
    if (!testRes.ok) return false;
    const testJson = await testRes.json();
    const testData = testJson.data?.test || testJson.data || testJson;
    const testTitle = testData.title || customTitle || "Test Paper";

    // Format safe filename
    const safeTitle = testTitle.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 60);
    const filename = `${prefix}_${safeTitle}.json`;
    const filePath = path.join(outDir, filename);

    if (fs.existsSync(filePath) && !process.env.FORCE_OVERWRITE && !process.env.REPAIR_MODE) {
      return true; // Already safely persisted
    }

    // Auto submit to unlock solutions
    try {
      await fetch(testUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ task: "submit", responses: {} })
      });
    } catch (e) {}

    // Fetch official solutions
    const ansUrl = `https://api.testbook.com/api/v2/tests/${testId}/answers`;
    let answersMap = {};
    try {
      const ansRes = await fetch(ansUrl, { headers });
      if (ansRes.ok) {
        const ansJson = await ansRes.json();
        const rawData = ansJson.data?.answers || ansJson.data || {};
        if (Array.isArray(rawData)) {
          for (const a of rawData) {
            const qId = a.questionId || a._id || a.id;
            if (qId) answersMap[qId] = a;
          }
        } else if (typeof rawData === 'object' && rawData !== null) {
          for (const [qId, a] of Object.entries(rawData)) {
            answersMap[qId] = a;
          }
        }
      }
    } catch (e) {}

    const sections = testData.sections || [];
    const questions = [];
    let questionIndex = 0;

    for (const sec of sections) {
      const secId = sec.id || sec._id || `sec_${Math.random().toString(36).substring(2, 7)}`;
      const secName = sec.name || sec.title || "General";
      const qList = sec.questions || [];

      for (const q of qList) {
        questionIndex++;
        const qId = q.id || q._id || `q_${questionIndex}`;
        const ansObj = answersMap[qId] || {};

        let questionHtml = "";
        if (q.en && q.en.value) {
          questionHtml = cleanHtml(q.en.value);
        } else if (q.en && typeof q.en === 'string') {
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
        if (ansObj.sol && ansObj.sol.en && ansObj.sol.en.value) {
          solutionHtml = cleanHtml(ansObj.sol.en.value);
        } else if (ansObj.sol && typeof ansObj.sol.en === 'string') {
          solutionHtml = cleanHtml(ansObj.sol.en);
        } else if (ansObj.solution && ansObj.solution.en && ansObj.solution.en.value) {
          solutionHtml = cleanHtml(ansObj.solution.en.value);
        } else if (ansObj.solution && typeof ansObj.solution === 'string') {
          solutionHtml = cleanHtml(ansObj.solution);
        } else if (ansObj.explanation && typeof ansObj.explanation === 'string') {
          solutionHtml = cleanHtml(ansObj.explanation);
        } else if (ansObj.explanation && ansObj.explanation.en) {
          solutionHtml = cleanHtml(ansObj.explanation.en.value || ansObj.explanation.en);
        } else if (q.en && q.en.solution) {
          solutionHtml = cleanHtml(q.en.solution.value || q.en.solution);
        } else if (q.solution) {
          solutionHtml = cleanHtml(typeof q.solution === 'object' ? (q.solution.value || q.solution.en || "") : q.solution);
        }

        let correctOptionIndex = 0;
        if (ansObj.correctOption !== undefined) {
          correctOptionIndex = ansObj.correctOption;
        } else if (ansObj.answer !== undefined) {
          correctOptionIndex = ansObj.answer;
        } else if (ansObj.ans !== undefined) {
          correctOptionIndex = ansObj.ans;
        } else if (q.correctOption !== undefined) {
          correctOptionIndex = q.correctOption;
        }

        let direction = "";
        if (q.direction) {
          direction = typeof q.direction === 'object' ? cleanHtml(q.direction.value || q.direction.en || "") : cleanHtml(q.direction);
        } else if (q.passage) {
          direction = typeof q.passage === 'object' ? cleanHtml(q.passage.value || q.passage.en || "") : cleanHtml(q.passage);
        } else if (q.precondition) {
          direction = typeof q.precondition === 'object' ? cleanHtml(q.precondition.value || q.precondition.en || "") : cleanHtml(q.precondition);
        } else if (q.en) {
          if (q.en.direction) direction = cleanHtml(q.en.direction.value || q.en.direction);
          else if (q.en.passage) direction = cleanHtml(q.en.passage.value || q.en.passage);
          else if (q.en.precondition) direction = cleanHtml(q.en.precondition.value || q.en.precondition);
        }

        questions.push({
          id: qId,
          questionIndex,
          sectionId: secId,
          sectionName: secName,
          questionHtml,
          direction: direction || undefined,
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

    const fullCleanJson = {
      id: testId,
      title: testTitle,
      exam: examCode,
      stage,
      pattern: "NEW_PATTERN_2026",
      totalQuestions: questions.length,
      totalDurationMinutes: Math.round((testData.duration || 3600) / 60),
      totalMarks: testData.totalMarks || questions.reduce((acc, q) => acc + (q.positiveMarks || 1), 0),
      solutionsCount: questions.filter(q => q.solutionHtml && q.solutionHtml.length > 0).length || questions.length,
      negativeMarkingFactor: stage.includes("UPSC") ? 0.33 : 0.25,
      sections: sections.map((s) => ({
        id: s.id || s._id,
        name: s.name || s.title || "Section",
        durationMinutes: s.duration ? Math.round(s.duration / 60) : null,
        questionCount: s.questions ? s.questions.length : (s.questionCount || 0)
      })),
      questions
    };

    fs.writeFileSync(filePath, JSON.stringify(fullCleanJson, null, 2));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Exhaustive 2-Step Crawler: Inspects full blueprint and exhausts every section & subsection.
 */
async function exhaustSeriesPack(domain, seriesId, examName, examCode, stage) {
  console.log(`\n🔍 [${domain}] Inspecting Series Blueprint: ${examName} (${seriesId})...`);
  
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

  // Case 1: Hierarchical Multi-Section Pack
  if (sections && sections.length > 0) {
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
        let subCount = 0;

        // Exhaust until no more tests remain (NO LIMITS)
        while (true) {
          const url = `https://api.testbook.com/api/v2/test-series/${seriesId}/tests/details?sectionId=${sec.id}&subSectionId=${sub.id}&limit=100&skip=${skip}`;
          let tests = [];
          try {
            const r = await fetch(url, { headers });
            if (r.ok) {
              const jd = await r.json();
              tests = jd.data?.tests || [];
            }
          } catch (e) {
            break;
          }

          if (!tests || tests.length === 0) break;

          for (let tIdx = 0; tIdx < tests.length; tIdx++) {
            const t = tests[tIdx];
            const prefix = `${examCode}_${(subCount + 1).toString().padStart(3, '0')}`;
            const success = await ingestSingleTest(t.id, outDir, prefix, examCode, stage, t.title);
            if (success) {
              subCount++;
              totalSeriesIngested++;
              if (subCount % 10 === 0 || subCount === 1) {
                console.log(`  ⚡ [${domain} > ${examName} > ${secName} > ${subName}] Ingested ${subCount} tests (Current: "${t.title}")`);
              }
            }
          }

          if (tests.length < 100) break;
          skip += 100;
        }
      }
    }
  } else {
    // Case 2: Flat Series Pack
    const outDir = path.join(GDRIVE_ROOT, domain, examName, "01_ALL_PAPERS");
    let skip = 0;
    let flatCount = 0;

    while (true) {
      const url = `https://api.testbook.com/api/v2/test-series/${seriesId}/tests/details?limit=100&skip=${skip}`;
      let tests = [];
      try {
        const r = await fetch(url, { headers });
        if (r.ok) {
          const jd = await r.json();
          tests = jd.data?.tests || [];
        }
      } catch (e) {
        break;
      }

      if (!tests || tests.length === 0) break;

      for (let tIdx = 0; tIdx < tests.length; tIdx++) {
        const t = tests[tIdx];
        const prefix = `${examCode}_${(flatCount + 1).toString().padStart(3, '0')}`;
        const success = await ingestSingleTest(t.id, outDir, prefix, examCode, stage, t.title);
        if (success) {
          flatCount++;
          totalSeriesIngested++;
          if (flatCount % 20 === 0 || flatCount === 1) {
            console.log(`  ⚡ [${domain} > ${examName}] Ingested ${flatCount} tests (Current: "${t.title}")`);
          }
        }
      }

      if (tests.length < 100) break;
      skip += 100;
    }
  }

  console.log(`✅ [${domain} > ${examName}] Finished Exhaustive Ingestion: ${totalSeriesIngested} Total Tests Safely Stored!\n`);
  return totalSeriesIngested;
}

module.exports = {
  ingestSingleTest,
  exhaustSeriesPack,
  GDRIVE_ROOT
};
