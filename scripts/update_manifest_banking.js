const fs = require('fs');
const path = require('path');

const GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER";
const manifestPathGDrive = path.join(GDRIVE_ROOT, "manifest.json");
const manifestPathLocal = path.join(__dirname, '..', 'data', 'manifest.json');

function updateManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPathLocal, 'utf8'));

  const bankingCat = manifest.categories.find(c => c.id === 'banking');
  if (!bankingCat) return;

  // 1. Add SBI PO if not exists
  let sbiPoExam = bankingCat.exams.find(e => e.id === 'sbi_po');
  if (!sbiPoExam) {
    sbiPoExam = {
      id: "sbi_po",
      name: "SBI PO (Probationary Officer)",
      code: "SBI_PO_2026",
      description: "SBI PO Recruitment Exam (Prelims & Mains Mocks with Full Solutions)",
      totalTests: 0,
      stages: []
    };
    bankingCat.exams.push(sbiPoExam);
  }

  // Populate SBI PO Mains Stage
  const sbiMainsDir = path.join(GDRIVE_ROOT, "Banking", "SBI_PO", "02_MAINS_FULL_MOCKS");
  if (fs.existsSync(sbiMainsDir)) {
    const files = fs.readdirSync(sbiMainsDir).filter(f => f.endsWith('.json'));
    const stageTests = [];
    for (const f of files) {
      try {
        const testContent = JSON.parse(fs.readFileSync(path.join(sbiMainsDir, f), 'utf8'));
        stageTests.push({
          id: testContent.id,
          filename: f,
          relativePath: `Banking/SBI_PO/02_MAINS_FULL_MOCKS/${f}`,
          title: testContent.title,
          totalQuestions: testContent.totalQuestions,
          totalDurationMinutes: testContent.totalDurationMinutes,
          totalMarks: testContent.totalMarks,
          solutionsCount: testContent.solutionsCount || testContent.totalQuestions,
          pattern: "NEW_PATTERN_2026",
          stage: "MAINS"
        });
      } catch (e) {}
    }

    let mainsStage = sbiPoExam.stages.find(s => s.id === '02_mains_full_mocks');
    if (!mainsStage) {
      mainsStage = {
        id: "02_mains_full_mocks",
        folderName: "02_MAINS_FULL_MOCKS",
        name: "MAINS FULL LENGTH MOCKS (170 Qs)",
        pattern: "NEW_PATTERN_2026",
        totalTests: stageTests.length,
        tests: stageTests
      };
      sbiPoExam.stages.push(mainsStage);
    } else {
      mainsStage.tests = stageTests;
      mainsStage.totalTests = stageTests.length;
    }
    sbiPoExam.totalTests = sbiPoExam.stages.reduce((acc, s) => acc + (s.totalTests || 0), 0);
  }

  // 2. Add IBPS RRB PO if not exists
  let rrbPoExam = bankingCat.exams.find(e => e.id === 'ibps_rrb_po');
  if (!rrbPoExam) {
    rrbPoExam = {
      id: "ibps_rrb_po",
      name: "IBPS RRB Scale-I (Officer Scale-I)",
      code: "IBPS_RRB_PO_2026",
      description: "Regional Rural Banks Officer Scale-I Prelims & Mains Practice Tests",
      totalTests: 0,
      stages: []
    };
    bankingCat.exams.push(rrbPoExam);
  }

  const rrbPrelimsDir = path.join(GDRIVE_ROOT, "Banking", "IBPS_RRB_PO", "01_PRELIMS_FULL_MOCKS");
  if (fs.existsSync(rrbPrelimsDir)) {
    const files = fs.readdirSync(rrbPrelimsDir).filter(f => f.endsWith('.json'));
    const stageTests = [];
    for (const f of files) {
      try {
        const testContent = JSON.parse(fs.readFileSync(path.join(rrbPrelimsDir, f), 'utf8'));
        stageTests.push({
          id: testContent.id,
          filename: f,
          relativePath: `Banking/IBPS_RRB_PO/01_PRELIMS_FULL_MOCKS/${f}`,
          title: testContent.title,
          totalQuestions: testContent.totalQuestions,
          totalDurationMinutes: testContent.totalDurationMinutes,
          totalMarks: testContent.totalMarks,
          solutionsCount: testContent.solutionsCount || testContent.totalQuestions,
          pattern: "NEW_PATTERN_2026",
          stage: "PRELIMS"
        });
      } catch (e) {}
    }

    let prelimsStage = rrbPoExam.stages.find(s => s.id === '01_prelims_full_mocks');
    if (!prelimsStage) {
      prelimsStage = {
        id: "01_prelims_full_mocks",
        folderName: "01_PRELIMS_FULL_MOCKS",
        name: "PRELIMS FULL LENGTH MOCKS (80 Qs)",
        pattern: "NEW_PATTERN_2026",
        totalTests: stageTests.length,
        tests: stageTests
      };
      rrbPoExam.stages.push(prelimsStage);
    } else {
      prelimsStage.tests = stageTests;
      prelimsStage.totalTests = stageTests.length;
    }
    rrbPoExam.totalTests = rrbPoExam.stages.reduce((acc, s) => acc + (s.totalTests || 0), 0);
  }

  manifest.lastUpdated = new Date().toISOString();
  const updatedJson = JSON.stringify(manifest, null, 2);

  fs.writeFileSync(manifestPathLocal, updatedJson);
  if (fs.existsSync(manifestPathGDrive)) {
    fs.writeFileSync(manifestPathGDrive, updatedJson);
  }

  console.log(`✨ Successfully updated manifest with SBI PO (${sbiPoExam.totalTests} tests) and IBPS RRB PO (${rrbPoExam.totalTests} tests)!`);
}

updateManifest();
