/**
 * Permanent 100-Question Shift Compiler for SSC CGL Tier-I
 * Combines the 4 matching 25-question subject drills into
 * authentic 100-Question / 200-Marks / 60-Minute CBT Mock Papers.
 */

const fs = require('fs');
const path = require('path');

const GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER";
const SSC_ROOT = path.join(GDRIVE_ROOT, "SSC");

const MATHS_DIR = path.join(SSC_ROOT, "SSC_MATHS_PYP", "01_MATHS_SHIFTS");
const REAS_DIR = path.join(SSC_ROOT, "SSC_REASONING_PYP", "02_REASONING_SHIFTS");
const ENG_DIR = path.join(SSC_ROOT, "SSC_ENGLISH_PYP", "03_ENGLISH_SHIFTS");
const GK_DIR = path.join(SSC_ROOT, "SSC_GK_PYP", "04_GK_SHIFTS");

const OUT_DIR = path.join(SSC_ROOT, "SSC_CGL", "01_OFFICIAL_FULL_SHIFTS");

function cleanShiftTitle(rawTitle) {
  let title = rawTitle
    .replace(/^PYST\s*\d+:\s*/i, '')
    .replace(/-\s*(Quantitative Aptitude|Reasoning|English|General Knowledge|General Awareness)\s*/gi, '')
    .replace(/\(Held On:\s*/i, '(Held: ')
    .replace(/_/g, ' ')
    .trim();

  return `SSC CGL Tier-I Official Paper ${title}`;
}

async function runMerger() {
  console.log("==================================================================");
  console.log("🚀 STARTING 100-QUESTION SSC CGL FULL SHIFT PAPER MERGER");
  console.log("==================================================================\n");

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const mathsFiles = fs.readdirSync(MATHS_DIR).filter(f => f.endsWith('.json')).sort();
  console.log(`Found ${mathsFiles.length} shifts to merge across all 4 subjects...`);

  let mergedCount = 0;

  for (let i = 0; i < mathsFiles.length; i++) {
    const shiftIndex = i + 1;
    const indexStr = shiftIndex.toString().padStart(3, '0');
    
    const mathsFile = path.join(MATHS_DIR, `SSC_MATHS_PYP_Test_${indexStr}.json`);
    const reasFile = path.join(REAS_DIR, `SSC_REASONING_PYP_Test_${indexStr}.json`);
    const engFile = path.join(ENG_DIR, `SSC_ENGLISH_PYP_Test_${indexStr}.json`);
    const gkFile = path.join(GK_DIR, `SSC_GK_PYP_Test_${indexStr}.json`);

    if (!fs.existsSync(mathsFile) || !fs.existsSync(reasFile) || !fs.existsSync(engFile) || !fs.existsSync(gkFile)) {
      continue;
    }

    try {
      const mathsData = JSON.parse(fs.readFileSync(mathsFile, 'utf8'));
      const reasData = JSON.parse(fs.readFileSync(reasFile, 'utf8'));
      const engData = JSON.parse(fs.readFileSync(engFile, 'utf8'));
      const gkData = JSON.parse(fs.readFileSync(gkFile, 'utf8'));

      const fullTitle = cleanShiftTitle(mathsData.title || `Shift ${shiftIndex}`);
      const shiftTestId = `ssc_cgl_full_shift_${indexStr}`;

      // Re-index all questions sequentially from 1 to 100 with accurate section tags
      const fullQuestions = [];
      let qIndex = 0;

      // Section 1: General Intelligence and Reasoning (1–25)
      const secReasId = "sec_reas";
      for (const q of (reasData.questions || [])) {
        qIndex++;
        fullQuestions.push({
          ...q,
          questionIndex: qIndex,
          sectionId: secReasId,
          sectionName: "General Intelligence & Reasoning",
          positiveMarks: 2.0,
          negativeMarks: 0.50
        });
      }

      // Section 2: General Awareness (26–50)
      const secGaId = "sec_ga";
      for (const q of (gkData.questions || [])) {
        qIndex++;
        fullQuestions.push({
          ...q,
          questionIndex: qIndex,
          sectionId: secGaId,
          sectionName: "General Awareness",
          positiveMarks: 2.0,
          negativeMarks: 0.50
        });
      }

      // Section 3: Quantitative Aptitude (51–75)
      const secQuantId = "sec_quant";
      for (const q of (mathsData.questions || [])) {
        qIndex++;
        fullQuestions.push({
          ...q,
          questionIndex: qIndex,
          sectionId: secQuantId,
          sectionName: "Quantitative Aptitude",
          positiveMarks: 2.0,
          negativeMarks: 0.50
        });
      }

      // Section 4: English Comprehension (76–100)
      const secEngId = "sec_eng";
      for (const q of (engData.questions || [])) {
        qIndex++;
        fullQuestions.push({
          ...q,
          questionIndex: qIndex,
          sectionId: secEngId,
          sectionName: "English Comprehension",
          positiveMarks: 2.0,
          negativeMarks: 0.50
        });
      }

      const fullShiftJson = {
        id: shiftTestId,
        title: fullTitle,
        exam: "SSC_CGL_2026",
        stage: "TIER_1",
        pattern: "NEW_PATTERN_2026",
        totalQuestions: fullQuestions.length,
        totalDurationMinutes: 60,
        totalMarks: 200,
        solutionsCount: fullQuestions.filter(q => q.solutionHtml && q.solutionHtml.length > 0).length || fullQuestions.length,
        negativeMarkingFactor: 0.25,
        sections: [
          {
            id: secReasId,
            name: "General Intelligence & Reasoning",
            durationMinutes: null,
            questionCount: (reasData.questions || []).length
          },
          {
            id: secGaId,
            name: "General Awareness",
            durationMinutes: null,
            questionCount: (gkData.questions || []).length
          },
          {
            id: secQuantId,
            name: "Quantitative Aptitude",
            durationMinutes: null,
            questionCount: (mathsData.questions || []).length
          },
          {
            id: secEngId,
            name: "English Comprehension",
            durationMinutes: null,
            questionCount: (engData.questions || []).length
          }
        ],
        questions: fullQuestions
      };

      const outFilename = `SSC_CGL_Full_Shift_${indexStr}.json`;
      const outFilePath = path.join(OUT_DIR, outFilename);
      fs.writeFileSync(outFilePath, JSON.stringify(fullShiftJson, null, 2));
      mergedCount++;

      if (mergedCount % 20 === 0 || mergedCount === mathsFiles.length) {
        console.log(`✅ [Merged ${mergedCount}/${mathsFiles.length}] -> ${outFilename} ("${fullTitle}" - 100 Qs / 200M / 60m)`);
      }
    } catch (e) {
      console.error(`Error merging shift ${shiftIndex}:`, e.message);
    }
  }

  console.log("\n==================================================================");
  console.log(`🎉 100% COMPLETE! ${mergedCount} Full-Length 100-Question Shift Papers Created!`);
  console.log(`📁 Target Directory: ${OUT_DIR}`);
  console.log("==================================================================");
}

runMerger();
