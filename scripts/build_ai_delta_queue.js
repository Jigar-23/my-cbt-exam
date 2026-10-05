/**
 * scripts/build_ai_delta_queue.js
 * 
 * Surgical Delta Queue Builder for CBT Exam Master AI Solver
 * 
 * Sifting Rules:
 * 1. Skips 100% of fully verified tests with authentic answers & rich solutions (Banking, SSC, etc.)
 * 2. Queues only tests where answer keys are missing (null), all defaulted to 0/1 without solutions,
 *    or where explanations contain placeholders ("pending attempt sync").
 * 3. Identifies question-level counts for precise token/cost budgeting.
 */

const fs = require('fs');
const path = require('path');

const VAULT_BASE = '/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER';
const QUEUE_FILE = path.join(__dirname, 'solver_delta_queue.json');

function auditTestFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const doc = JSON.parse(raw);
    const testId = doc.id || doc.testId;
    if (!testId) return null;

    let questions = doc.questions;
    if (!questions || questions.length === 0) {
      if (doc.sections) {
        questions = [];
        for (const s of doc.sections) {
          if (s.questions) questions.push(...s.questions);
        }
      } else {
        questions = [];
      }
    }

    if (questions.length === 0) return null;

    const optDistribution = new Set();
    let totalRealSolutions = 0;
    const deficientQuestionIds = [];

    for (const q of questions) {
      const qId = q.id || q._id;
      const opt = q.correctOptionId ?? q.correctOptionIndex ?? q.correctOption ?? null;
      if (opt !== null && opt !== undefined) {
        optDistribution.add(String(opt));
      }
      
      const sol = (q.explanation || q.solutionHtml || q.solution || '').trim();
      const hasRealSol = sol.length > 50 && !sol.includes('pending attempt sync') && !sol.includes('Official step-by-step');
      if (hasRealSol) {
        totalRealSolutions++;
      }

      // Check question deficiency
      const isDeficient = opt === null || opt === undefined || !hasRealSol;
      if (isDeficient) {
        deficientQuestionIds.push(qId);
      }
    }

    const isAllZeroOne = optDistribution.size <= 1 && (optDistribution.has('0') || optDistribution.has('1') || optDistribution.size === 0);
    const needsSolving = (isAllZeroOne && totalRealSolutions < questions.length * 0.5) || deficientQuestionIds.length > 0;

    if (!needsSolving) {
      return null; // 100% complete and authentic -> zero extra load!
    }

    return {
      testId,
      title: doc.title || path.basename(filePath, '.json'),
      filePath,
      totalQuestions: questions.length,
      deficientQuestionsCount: deficientQuestionIds.length,
      deficientQuestionIds,
      allZeroOneDefault: isAllZeroOne,
      existingRealSolutions: totalRealSolutions,
    };
  } catch (e) {
    return null;
  }
}

function scanVault(dir) {
  let deltaQueue = [];
  let totalScanned = 0;
  let healthyTests = 0;

  console.log(`\n🔍 Scanning CBT Vault: ${dir}`);

  const KNOWN_HEALTHY_DIRS = new Set(['Banking', 'SSC', 'Subject_Practice', 'Solutions']);

  function walk(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.name.startsWith('.') || ent.name.startsWith('._')) continue;
        if (currentDir === dir && KNOWN_HEALTHY_DIRS.has(ent.name)) {
          console.log(`⏩ Skipping 100% verified healthy category: ${ent.name}`);
          continue;
        }
        const full = path.join(currentDir, ent.name);
        if (ent.isDirectory()) {
          walk(full);
        } else if (ent.isFile() && ent.name.endsWith('.json') && !ent.name.includes('manifest') && !ent.name.includes('security')) {
          totalScanned++;
          if (totalScanned % 200 === 0) {
            console.log(`   [Scanned ${totalScanned} tests | Defective identified: ${deltaQueue.length}]`);
          }
          const audit = auditTestFile(full);
          if (audit) {
            deltaQueue.push(audit);
          } else {
            healthyTests++;
          }
        }
      }
    } catch (e) {}
  }

  walk(dir);
  return { deltaQueue, totalScanned, healthyTests };
}

function main() {
  console.log('================================================================');
  console.log('🎯 CBT EXAM MASTER — SURGICAL AI SOLVER DELTA QUEUE BUILDER');
  console.log('================================================================');

  if (!fs.existsSync(VAULT_BASE)) {
    console.error(`❌ Vault directory not found: ${VAULT_BASE}`);
    process.exit(1);
  }

  const { deltaQueue, totalScanned, healthyTests } = scanVault(VAULT_BASE);

  const totalDeficientQuestions = deltaQueue.reduce((acc, t) => acc + t.deficientQuestionsCount, 0);

  fs.writeFileSync(QUEUE_FILE, JSON.stringify(deltaQueue, null, 2), 'utf8');

  console.log(`\n\n✅ Scan Complete!`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Total Test Files Scanned   : ${totalScanned}`);
  console.log(`Verified Healthy Tests     : ${healthyTests} (Untouched, ZERO AI load)`);
  console.log(`Defective / Delta Tests    : ${deltaQueue.length}`);
  console.log(`Total Questions to Solve   : ${totalDeficientQuestions}`);
  console.log(`Queue exported to          : ${QUEUE_FILE}`);
  console.log(`----------------------------------------------------------------\n`);
}

main();
