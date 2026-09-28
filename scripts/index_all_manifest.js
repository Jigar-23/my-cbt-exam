/**
 * Master Indexer: Scans all directories in Google Drive Desktop folder
 * and compiles manifest.json with full exam catalog, stages, question counts, and duration.
 */

const fs = require('fs');
const path = require('path');

const GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER";
const manifestPathGDrive = path.join(GDRIVE_ROOT, "manifest.json");
const manifestPathLocal = path.join(__dirname, '..', 'data', 'manifest.json');

const DOMAIN_MAP = {
  Banking: {
    id: "banking",
    name: "Banking Officers",
    icon: "Landmark",
    exams: {
      IBPS_SO_IT: { id: "ibps_so_it", name: "IBPS SO (IT Officer)", code: "IBPS_SO_IT_2026", desc: "CRP-SPL-XVI (Prelims, Mains & Drills)" },
      SBI_PO: { id: "sbi_po", name: "SBI PO (Probationary Officer)", code: "SBI_PO_2026", desc: "SBI Probationary Officers Prelims & Mains Mocks" },
      IBPS_PO: { id: "ibps_po", name: "IBPS PO (Probationary Officer)", code: "IBPS_PO_2026", desc: "IBPS Probationary Officers Mocks with Solutions" },
      IBPS_RRB_PO: { id: "ibps_rrb_po", name: "IBPS RRB Scale-I (Officer Scale-I)", code: "IBPS_RRB_PO_2026", desc: "Regional Rural Banks Officer Scale-I Tests" }
    }
  },
  Civil_Services: {
    id: "civil_services",
    name: "Civil Services & UPSC",
    icon: "ShieldAlert",
    exams: {
      UPSC_CSE_GS1: { id: "upsc_cse_gs1", name: "UPSC CSE (Prelims GS-1)", code: "UPSC_CSE_GS1", desc: "General Studies Paper-1 Full Length Mocks (100 Qs / 200M)" },
      UPSC_CSE_CSAT: { id: "upsc_cse_csat", name: "UPSC CSE (CSAT Paper-2)", code: "UPSC_CSE_CSAT", desc: "Civil Services Aptitude Test Paper-2 Mocks (80 Qs / 200M)" },
      UPSC_ESE: { id: "upsc_ese", name: "UPSC ESE (Engineering Services)", code: "UPSC_ESE_2026", desc: "Engineering Services Stage-I Preliminary Papers" }
    }
  },
  Regulatory: {
    id: "regulatory",
    name: "Regulatory Bodies",
    icon: "Scale",
    exams: {
      RBI_GRADE_B: { id: "rbi_grade_b", name: "RBI Grade B (General)", code: "RBI_GRADE_B_2026", desc: "Reserve Bank of India Grade B Officer Phase-I & II" },
      SEBI_GRADE_A: { id: "sebi_grade_a", name: "SEBI Grade A (Assistant Manager)", code: "SEBI_GRADE_A_2026", desc: "Securities & Exchange Board of India Assistant Manager Mocks" },
      NABARD_GRADE_A: { id: "nabard_grade_a", name: "NABARD Grade A (RDBS / IT)", code: "NABARD_GRADE_A_2026", desc: "National Bank for Agriculture & Rural Development Prelims Mocks" }
    }
  },
  Defense: {
    id: "defense",
    name: "Defense Officer Entry",
    icon: "Shield",
    exams: {
      UPSC_CDS: { id: "upsc_cds", name: "UPSC CDS (IMA, INA, OTA)", code: "UPSC_CDS_2026", desc: "Combined Defence Services English, GK, and Math Papers" },
      AFCAT: { id: "afcat", name: "AFCAT (Air Force Entry)", code: "AFCAT_2026", desc: "Air Force Common Admission Test 100 Qs CBT Mocks" },
      UPSC_CAPF: { id: "upsc_capf", name: "UPSC CAPF (Assistant Commandant)", code: "UPSC_CAPF_2026", desc: "Central Armed Police Forces Paper-1 General Ability Mocks" }
    }
  },
  SSC: {
    id: "ssc",
    name: "Staff Selection (SSC)",
    icon: "Award",
    exams: {
      SSC_CGL: { id: "ssc_cgl_tier1", name: "SSC CGL (Tier-I CBT)", code: "SSC_CGL_2026", desc: "Combined Graduate Level Tier-I 100 Qs / 200 Marks Mocks" },
      LIC_AAO: { id: "lic_aao", name: "LIC AAO (Generalist / IT)", code: "LIC_AAO_2026", desc: "Life Insurance Corporation Assistant Administrative Officer Mocks" }
    }
  }
};

function indexAll() {
  console.log("🔍 Scanning all synced exam folders in Google Drive Desktop...");

  // Load existing manifest for IBPS SO IT drive IDs preservation
  let baseManifest = { version: "2.0.0", lastUpdated: new Date().toISOString(), categories: [] };
  if (fs.existsSync(manifestPathLocal)) {
    try {
      baseManifest = JSON.parse(fs.readFileSync(manifestPathLocal, 'utf8'));
    } catch (e) {}
  }

  const categories = [];

  for (const [domainFolder, domainDef] of Object.entries(DOMAIN_MAP)) {
    const domainDirPath = path.join(GDRIVE_ROOT, domainFolder);
    const categoryObj = {
      id: domainDef.id,
      name: domainDef.name,
      icon: domainDef.icon,
      exams: []
    };

    for (const [examFolder, examDef] of Object.entries(domainDef.exams)) {
      const examDirPath = path.join(domainDirPath, examFolder);
      const examObj = {
        id: examDef.id,
        name: examDef.name,
        code: examDef.code,
        description: examDef.desc,
        totalTests: 0,
        stages: []
      };

      if (fs.existsSync(examDirPath)) {
        const stageDirs = fs.readdirSync(examDirPath).filter(d => fs.statSync(path.join(examDirPath, d)).isDirectory());
        
        for (const stageDir of stageDirs) {
          const fullStagePath = path.join(examDirPath, stageDir);
          const files = fs.readdirSync(fullStagePath).filter(f => f.endsWith('.json'));
          const stageTests = [];

          for (const file of files) {
            try {
              const content = JSON.parse(fs.readFileSync(path.join(fullStagePath, file), 'utf8'));
              stageTests.push({
                id: content.id,
                filename: file,
                relativePath: `${domainFolder}/${examFolder}/${stageDir}/${file}`,
                title: content.title,
                totalQuestions: content.totalQuestions,
                totalDurationMinutes: content.totalDurationMinutes,
                totalMarks: content.totalMarks,
                solutionsCount: content.solutionsCount || content.totalQuestions,
                pattern: content.pattern || "NEW_PATTERN_2026",
                stage: content.stage || "MOCK"
              });
            } catch (e) {}
          }

          if (stageTests.length > 0) {
            examObj.stages.push({
              id: stageDir.toLowerCase(),
              folderName: stageDir,
              name: stageDir.replace(/^\d+_/, '').replace(/_/g, ' '),
              pattern: "NEW_PATTERN_2026",
              totalTests: stageTests.length,
              tests: stageTests
            });
          }
        }
      }

      // Preserve IBPS SO IT tests from existing manifest if present
      if (examDef.id === 'ibps_so_it') {
        const existingCat = baseManifest.categories?.find(c => c.id === 'banking');
        const existingExam = existingCat?.exams?.find(e => e.id === 'ibps_so_it');
        if (existingExam && existingExam.stages?.length > 0) {
          examObj.stages = existingExam.stages;
          examObj.totalTests = existingExam.totalTests;
        }
      } else {
        examObj.totalTests = examObj.stages.reduce((acc, s) => acc + (s.totalTests || 0), 0);
      }

      categoryObj.exams.push(examObj);
    }

    categories.push(categoryObj);
  }

  const finalManifest = {
    version: "2.0.0",
    lastUpdated: new Date().toISOString(),
    categories
  };

  const jsonStr = JSON.stringify(finalManifest, null, 2);
  fs.writeFileSync(manifestPathLocal, jsonStr);
  if (fs.existsSync(manifestPathGDrive)) {
    fs.writeFileSync(manifestPathGDrive, jsonStr);
  }

  console.log("✨ Comprehensive Manifest Successfully Re-Indexed!");
}

indexAll();
