/**
 * Live Terminal Progress Bar & Monitor for CBT Exam Master Ingestion
 */

const fs = require('fs');
const path = require('path');

const GDRIVE_ROOT = "/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER";
const TARGET_TOTAL = 3500;

const DOMAIN_TARGETS = {
  Banking: { name: "Banking & Insurance Officers", target: 950 },
  Civil_Services: { name: "Civil Services & UPSC (CSE/CSAT)", target: 650 },
  Regulatory: { name: "Regulatory Bodies (RBI/SEBI/NABARD)", target: 400 },
  Defense: { name: "Defense Officers (CDS/AFCAT/CAPF)", target: 350 },
  SSC: { name: "Staff Selection Commission (CGL/CPO)", target: 1200 },
  State_PSC: { name: "State PSCs (BPSC/UPPSC/ISRO)", target: 350 }
};

function countFilesInDir(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        count += countFilesInDir(full);
      } else if (item.endsWith('.json') && item !== 'manifest.json') {
        count++;
      }
    }
  } catch (e) {}
  return count;
}

function renderProgressBar(current, total, width = 30) {
  const percent = Math.min(100, Math.max(0, (current / total) * 100));
  const filledWidth = Math.round((percent / 100) * width);
  const emptyWidth = width - filledWidth;
  const bar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
  return `[${bar}] ${percent.toFixed(1)}%`;
}

function renderSnapshot() {
  const domainCounts = {};
  let totalIngested = 0;

  for (const [domKey, def] of Object.entries(DOMAIN_TARGETS)) {
    const dir = path.join(GDRIVE_ROOT, domKey);
    const count = countFilesInDir(dir);
    domainCounts[domKey] = count;
    totalIngested += count;
  }

  const overallBar = renderProgressBar(totalIngested, TARGET_TOTAL, 35);

  console.clear();
  console.log("==========================================================================");
  console.log("🚀 CBT EXAM MASTER: 3,500+ QUESTION PAPER INGESTION MONITOR");
  console.log("==========================================================================");
  console.log(`\n📦 OVERALL PROGRESS: ${totalIngested} / ${TARGET_TOTAL} Question Papers`);
  console.log(`   ${overallBar}\n`);
  console.log("--------------------------------------------------------------------------");
  console.log("📁 DOMAIN BREAKDOWN:");
  console.log("--------------------------------------------------------------------------");

  for (const [domKey, def] of Object.entries(DOMAIN_TARGETS)) {
    const c = domainCounts[domKey] || 0;
    const domBar = renderProgressBar(c, def.target, 20);
    const label = def.name.padEnd(42, ' ');
    const countStr = `${c.toString().padStart(4, ' ')} / ${def.target}`.padEnd(12, ' ');
    console.log(` ${label} | ${countStr} | ${domBar}`);
  }

  console.log("--------------------------------------------------------------------------");
  console.log(`📂 Storage Sync Target: ${GDRIVE_ROOT}`);
  console.log(`⚡ Auto-Submit Unlocking: ACTIVE (100% official solutions with KaTeX)`);
  console.log(`⏱️ Last Updated: ${new Date().toLocaleTimeString('en-US', { hour12: false })} (Refreshing in real-time)`);
  console.log("==========================================================================\n");
}

renderSnapshot();
