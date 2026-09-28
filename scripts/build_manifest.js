/**
 * 100% Fully Dynamic Manifest Builder:
 * Scans all domain directories and subdirectories in Google Drive Desktop folder,
 * automatically generates rich metadata, and syncs manifest.json to Cloud & Local.
 */

const fs = require('fs');
const path = require('path');

const GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER";
const manifestPathGDrive = path.join(GDRIVE_ROOT, "manifest.json");
const manifestPathLocal = path.join(__dirname, '..', 'data', 'manifest.json');

const DOMAIN_METADATA = {
  Banking: { id: "banking", name: "Banking & Insurance Officers", icon: "Landmark" },
  Civil_Services: { id: "civil_services", name: "Civil Services & UPSC", icon: "ShieldAlert" },
  Regulatory: { id: "regulatory", name: "Regulatory Bodies", icon: "Scale" },
  Defense: { id: "defense", name: "Defense Officer Entry", icon: "Shield" },
  SSC: { id: "ssc", name: "Staff Selection (SSC)", icon: "Award" },
  State_PSC: { id: "state_psc", name: "State PSCs & High Courts", icon: "Building2" },
  Railways: { id: "railways", name: "Railway Recruitment Board (RRB Officers)", icon: "GraduationCap" }
};

function humanize(str) {
  return str
    .replace(/^\d+_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function build() {
  console.log("🛠️ Dynamically Compiling Complete Manifest from Google Drive...");

  let originalManifest = { categories: [] };
  if (fs.existsSync(manifestPathLocal)) {
    try {
      originalManifest = JSON.parse(fs.readFileSync(manifestPathLocal, 'utf8'));
    } catch (e) {}
  }

  const categories = [];
  const domainDirs = fs.readdirSync(GDRIVE_ROOT).filter(d => {
    const full = path.join(GDRIVE_ROOT, d);
    return fs.statSync(full).isDirectory() && !d.startsWith('.');
  });

  for (const domDir of domainDirs) {
    const meta = DOMAIN_METADATA[domDir] || {
      id: domDir.toLowerCase(),
      name: humanize(domDir),
      icon: "Award"
    };

    const domFullPath = path.join(GDRIVE_ROOT, domDir);
    const examDirs = fs.readdirSync(domFullPath).filter(e => {
      const full = path.join(domFullPath, e);
      return fs.statSync(full).isDirectory();
    });

    const categoryObj = {
      id: meta.id,
      name: meta.name,
      icon: meta.icon,
      exams: []
    };

    for (const examDir of examDirs) {
      const examFullPath = path.join(domFullPath, examDir);
      const examObj = {
        id: examDir.toLowerCase(),
        name: humanize(examDir),
        code: `${examDir.toUpperCase()}_2026`,
        description: `Official Practice Tests & Shift Papers for ${humanize(examDir)}`,
        totalTests: 0,
        stages: []
      };

      // Check if this is IBPS SO IT to preserve original Drive File IDs
      if (examDir === 'IBPS_SO_IT') {
        const origCat = originalManifest.categories?.find(c => c.id === 'banking');
        const origExam = origCat?.exams?.find(e => e.id === 'ibps_so_it');
        if (origExam && origExam.stages) {
          examObj.stages = origExam.stages;
          examObj.totalTests = origExam.totalTests;
          categoryObj.exams.push(examObj);
          continue;
        }
      }

      const stageDirs = fs.readdirSync(examFullPath).filter(s => {
        const full = path.join(examFullPath, s);
        return fs.statSync(full).isDirectory();
      });

      for (const sDir of stageDirs) {
        const stageFullPath = path.join(examFullPath, sDir);
        const files = fs.readdirSync(stageFullPath).filter(f => f.endsWith('.json') && f !== 'manifest.json');
        const stageTests = [];

        for (const file of files) {
          try {
            const testData = JSON.parse(fs.readFileSync(path.join(stageFullPath, file), 'utf8'));
            stageTests.push({
              id: testData.id,
              filename: file,
              relativePath: `${domDir}/${examDir}/${sDir}/${file}`,
              title: testData.title || humanize(file.replace('.json', '')),
              totalQuestions: testData.totalQuestions || 100,
              totalDurationMinutes: testData.totalDurationMinutes || 60,
              totalMarks: testData.totalMarks || 100,
              solutionsCount: testData.solutionsCount || testData.totalQuestions || 100,
              pattern: testData.pattern || "NEW_PATTERN_2026",
              stage: testData.stage || humanize(sDir)
            });
          } catch (e) {}
        }

        if (stageTests.length > 0) {
          examObj.stages.push({
            id: sDir.toLowerCase(),
            folderName: sDir,
            name: humanize(sDir),
            pattern: "NEW_PATTERN_2026",
            totalTests: stageTests.length,
            tests: stageTests
          });
        }
      }

      examObj.totalTests = examObj.stages.reduce((acc, s) => acc + (s.totalTests || 0), 0);
      if (examObj.totalTests > 0) {
        categoryObj.exams.push(examObj);
      }
    }

    if (categoryObj.exams.length > 0) {
      categories.push(categoryObj);
    }
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

  console.log("🎉 Dynamic Manifest Successfully Built and Synced to Google Drive & Local Storage!");
  for (const c of categories) {
    const total = c.exams.reduce((acc, e) => acc + (e.totalTests || 0), 0);
    console.log(`  - 📁 ${c.name}: ${total} Tests Ready Across ${c.exams.length} Subdomains`);
  }
}

build();
