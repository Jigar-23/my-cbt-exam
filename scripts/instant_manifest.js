/**
 * Instant Manifest Builder
 * Generates the complete manifest in < 200ms by parsing directory & filenames.
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

function instantBuild() {
  console.log("⚡ Building Instant Manifest from File System...");

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

  let grandTotalTests = 0;

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

    let domainTestCount = 0;

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

      if (examDir === 'IBPS_SO_IT') {
        const origCat = originalManifest.categories?.find(c => c.id === 'banking');
        const origExam = origCat?.exams?.find(e => e.id === 'ibps_so_it');
        if (origExam && origExam.stages) {
          examObj.stages = origExam.stages;
          examObj.totalTests = origExam.totalTests;
          categoryObj.exams.push(examObj);
          domainTestCount += examObj.totalTests;
          grandTotalTests += examObj.totalTests;
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
        
        if (files.length === 0) continue;

        const stageTests = files.map((file, idx) => {
          const rawName = file.replace('.json', '');
          const cleanTitle = humanize(rawName.replace(/^[A-Z0-9_]+_Test_\d+_?/, '').replace(/^[A-Z0-9_]+_\d+_?/, ''));
          return {
            id: `${examDir.toLowerCase()}_${sDir.toLowerCase()}_${idx + 1}`,
            filename: file,
            relativePath: `${domDir}/${examDir}/${sDir}/${file}`,
            title: cleanTitle || `Test ${idx + 1}`,
            totalQuestions: 100,
            totalDurationMinutes: 60,
            totalMarks: 100,
            solutionsCount: 100,
            pattern: "NEW_PATTERN_2026",
            stage: humanize(sDir)
          };
        });

        examObj.stages.push({
          id: sDir.toLowerCase(),
          name: humanize(sDir),
          totalTests: stageTests.length,
          tests: stageTests
        });
        examObj.totalTests += stageTests.length;
      }

      if (examObj.totalTests > 0) {
        categoryObj.exams.push(examObj);
        domainTestCount += examObj.totalTests;
        grandTotalTests += examObj.totalTests;
      }
    }

    if (categoryObj.exams.length > 0) {
      categories.push(categoryObj);
      console.log(`  - 📁 ${categoryObj.name}: ${domainTestCount} Tests Across ${categoryObj.exams.length} Subdomains`);
    }
  }

  const completeManifest = {
    version: "2026.4.0",
    lastUpdated: new Date().toISOString(),
    totalTestsCount: grandTotalTests,
    categories
  };

  const manifestJson = JSON.stringify(completeManifest, null, 2);
  fs.writeFileSync(manifestPathGDrive, manifestJson);
  fs.writeFileSync(manifestPathLocal, manifestJson);

  console.log(`\n🎉 Instant Manifest Successfully Built and Synced!`);
  console.log(`🎯 GRAND TOTAL TESTS INDEXED: ${grandTotalTests}`);
}

instantBuild();
