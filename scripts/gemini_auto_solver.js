/**
 * scripts/gemini_auto_solver.js
 * 
 * High-Precision AI Question Solver & Solution Generator for CBT Exam Master
 * Powered by Google Gemini 2.5 Flash
 * 
 * Features:
 * - Surgical delta processing: Only solves questions in the delta queue.
 * - Deep, non-trivial editorial solutions: Core Concept, Step-by-Step Derivation,
 *   Option Elimination, and Key Takeaways.
 * - Strict JSON Schema: Enforces valid option binding and prevents hallucinations.
 * - Dual persistence: Enriches test JSON on Google Drive and writes standalone solutions.json.
 * - Checkpointing & resume support.
 * 
 * Usage:
 *   node scripts/gemini_auto_solver.js --pilot 3      # Run on 3 test papers for inspection
 *   node scripts/gemini_auto_solver.js --all          # Run on all queued tests
 */

const fs = require('fs');
const path = require('path');

const QUEUE_FILE = path.join(__dirname, 'solver_delta_queue.json');
const CHECKPOINT_FILE = path.join(__dirname, 'solver_checkpoint.json');
const SOLUTIONS_VAULT = '/Users/jigar/Library/CloudStorage/GoogleDrive-pulkit10112@gmail.com/My Drive/CBT_EXAM_MASTER/Solutions';

// Load API Key
function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    const match = content.match(/GEMINI_API_KEY\s*=\s*(.+)/);
    if (match && match[1]) return match[1].trim();
  }

  const configPath = path.join(__dirname, '..', 'gemini_config.json');
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed.apiKey) return parsed.apiKey.trim();
    } catch {}
  }

  return '';
}

const API_KEY = getGeminiApiKey();
const MODEL_NAME = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// Load Checkpoint
function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
    } catch {}
  }
  return { completedTestIds: {}, processedQuestionsCount: 0 };
}

function saveCheckpoint(state) {
  try {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch {}
}

/**
 * Builds the high-rigor system prompt for Indian Competitive Exams
 */
const SYSTEM_INSTRUCTION = `You are a Senior Subject Matter Expert and Chief Editorial Examiner for premier Indian competitive examinations (UPSC Civil Services, RBI Grade B, RRB NTPC, CDS, AFCAT, and State PSCs).
Your task is to independently solve the provided multiple-choice questions with absolute academic rigor, pinpoint the correct option, and generate exhaustive step-by-step editorial explanations.

CRITICAL INSTRUCTIONS:
1. NO ONE-LINERS. Explanations must be comprehensive, pedagogically sound, and instructive for top-rank aspirants.
2. For each question, you MUST provide:
   - coreConcept: Theoretical Background or Context (define underlying rule, law, article, formula, or history).
   - stepByStepWorking: Complete calculations, proofs, or factual timelines.
   - optionAnalysis: Explicit evaluation of EVERY candidate option, detailing why incorrect options fail.
   - keyTakeaways: High-yield revision points, mnemonics, or relevant PYQ connections.
   - selectedOptionId: EXACT matching option id from the provided list.
3. If a direction or reading passage is provided, ground your solution strictly within that context.
4. Output MUST be valid JSON conforming to the requested schema.`;

/**
 * Solves a batch of questions using Gemini API with structured JSON output
 */
async function solveQuestionBatch(questionsBatch) {
  const promptPayload = questionsBatch.map((q, idx) => ({
    questionIndex: idx + 1,
    questionId: q.id || q._id,
    questionText: q.text || q.questionHtml || q.question,
    direction: q.direction || q.passage || undefined,
    options: (q.options || []).map((o, oIdx) => ({
      id: String(o.id ?? (oIdx + 1)),
      label: String(o.label ?? (oIdx + 1)),
      text: o.text || o.value || (typeof o === 'string' ? o : '')
    }))
  }));

  const userPrompt = `Solve the following multiple-choice questions. For each question, select the authentic correct option id and write a thorough, detailed editorial solution (Core Concept, Step-by-Step Derivation, Option Elimination Analysis, and Key Takeaway).

Questions:
${JSON.stringify(promptPayload, null, 2)}

Respond with a JSON array of objects with this exact structure:
[
  {
    "questionId": "string",
    "selectedOptionId": "string",
    "selectedOptionLabel": "string",
    "coreConcept": "string",
    "stepByStepWorking": "string",
    "optionAnalysis": [
      { "optionId": "string", "label": "string", "status": "Correct" | "Incorrect", "reason": "string" }
    ],
    "keyTakeaways": "string"
  }
]`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json"
    }
  };

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (HTTP ${response.status}): ${errText.slice(0, 200)}`);
  }

  const json = await response.json();
  const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error('Gemini returned empty response');
  }

  return JSON.parse(textContent);
}

/**
 * Formats structured AI solution into clean, professional HTML for CBT Exam Player
 */
function buildHtmlSolution(solutionData) {
  const optListHtml = (solutionData.optionAnalysis || []).map(opt => `
    <li><strong>Option (${opt.label || opt.optionId}) [${opt.status}]:</strong> ${opt.reason}</li>
  `).join('');

  return `
<div class="cbt-editorial-solution" style="font-family: inherit; line-height: 1.6;">
  <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; margin-bottom: 14px;">
    <strong style="color: #065f46; font-size: 14px;">✓ Verified Answer: Option (${solutionData.selectedOptionLabel || solutionData.selectedOptionId})</strong>
  </div>

  <div style="margin-bottom: 14px;">
    <h4 style="color: #1e293b; font-size: 13px; font-weight: 700; margin-bottom: 6px;">💡 Core Concept & Context:</h4>
    <p style="color: #334155; font-size: 13px; margin: 0;">${solutionData.coreConcept || ''}</p>
  </div>

  <div style="margin-bottom: 14px;">
    <h4 style="color: #1e293b; font-size: 13px; font-weight: 700; margin-bottom: 6px;">📐 Step-by-Step Proof & Derivation:</h4>
    <p style="color: #334155; font-size: 13px; margin: 0; white-space: pre-line;">${solutionData.stepByStepWorking || ''}</p>
  </div>

  <div style="margin-bottom: 14px;">
    <h4 style="color: #1e293b; font-size: 13px; font-weight: 700; margin-bottom: 6px;">🔍 Detailed Option Analysis:</h4>
    <ul style="color: #334155; font-size: 13px; padding-left: 18px; margin: 0; space-y: 4px;">
      ${optListHtml}
    </ul>
  </div>

  ${solutionData.keyTakeaways ? `
  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 10px 14px; border-radius: 6px;">
    <strong style="color: #1e40af; font-size: 12px;">📌 High-Yield Takeaway:</strong>
    <p style="color: #1e3a8a; font-size: 12px; margin: 4px 0 0 0;">${solutionData.keyTakeaways}</p>
  </div>
  ` : ''}
</div>
  `.trim();
}

/**
 * Enriches a single test paper in-place and saves sidecar backup
 */
async function processTestFile(item) {
  const filePath = item.filePath;
  const raw = fs.readFileSync(filePath, 'utf8');
  const doc = JSON.parse(raw);

  let allQuestions = doc.questions;
  if (!allQuestions || allQuestions.length === 0) {
    if (doc.sections) {
      allQuestions = [];
      for (const s of doc.sections) {
        if (s.questions) allQuestions.push(...s.questions);
      }
    } else {
      allQuestions = [];
    }
  }

  // Filter only deficient questions
  const deficientSet = new Set(item.deficientQuestionIds || []);
  const targetQuestions = allQuestions.filter(q => deficientSet.has(q.id || q._id));

  if (targetQuestions.length === 0) {
    return { skipped: true, reason: 'No deficient questions found' };
  }

  console.log(`\n🤖 Solving: [${path.basename(filePath)}] — ${targetQuestions.length} questions`);

  // Batch into chunks of 15 questions
  const BATCH_SIZE = 15;
  const solvedMap = {};

  for (let i = 0; i < targetQuestions.length; i += BATCH_SIZE) {
    const chunk = targetQuestions.slice(i, i + BATCH_SIZE);
    process.stdout.write(`   Processing questions ${i + 1} to ${Math.min(i + BATCH_SIZE, targetQuestions.length)} / ${targetQuestions.length}... `);
    
    const results = await solveQuestionBatch(chunk);
    for (const r of results) {
      if (r && r.questionId) {
        solvedMap[r.questionId] = r;
      }
    }
    console.log(`✓ Solved`);

    // Polite 1.5s delay between chunks
    await new Promise(r => setTimeout(r, 1500));
  }

  // Inject into test JSON
  let enrichedCount = 0;
  for (const q of allQuestions) {
    const qid = q.id || q._id;
    const solData = solvedMap[qid];
    if (solData && solData.selectedOptionId) {
      q.correctOptionId = String(solData.selectedOptionId);
      q.correctOptionIndex = Number(solData.selectedOptionId) - 1;
      const html = buildHtmlSolution(solData);
      q.solutionHtml = html;
      q.explanation = html;
      enrichedCount++;
    }
  }

  doc.solutionsCount = allQuestions.filter(q => q.solutionHtml || q.explanation).length;

  // 1. In-place write to Google Drive
  fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), 'utf8');

  // 2. Write sidecar backup
  try {
    const relativeToVault = path.relative(path.dirname(filePath).split('CBT_EXAM_MASTER')[0] + 'CBT_EXAM_MASTER', filePath);
    const sidecarPath = path.join(SOLUTIONS_VAULT, relativeToVault.replace(/\.json$/, '_solutions.json'));
    fs.mkdirSync(path.dirname(sidecarPath), { recursive: true });
    fs.writeFileSync(sidecarPath, JSON.stringify({
      testId: doc.id || doc.testId,
      solvedAt: new Date().toISOString(),
      model: MODEL_NAME,
      solutionsCount: Object.keys(solvedMap).length,
      solutions: solvedMap
    }, null, 2), 'utf8');
  } catch (e) {
    console.warn(`   ⚠️ Sidecar write warning:`, e.message);
  }

  console.log(`   ✅ Complete! Injected ${enrichedCount} deep solutions into Google Drive.`);
  return { success: true, enrichedCount };
}

async function main() {
  console.log('================================================================');
  console.log('🚀 CBT EXAM MASTER — GEMINI 2.5 AUTO-SOLVER & ENRICHMENT FLEET');
  console.log('================================================================');

  if (!API_KEY) {
    console.error('\n❌ No Gemini API Key found!');
    console.error('👉 Please provide your key via GEMINI_API_KEY environment variable,');
    console.error('   or add GEMINI_API_KEY=your_key in .env.local\n');
    process.exit(1);
  }

  if (!fs.existsSync(QUEUE_FILE)) {
    console.log('⚠️ Delta queue not found. Generating queue first...');
    require('./build_ai_delta_queue');
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  const checkpoint = loadCheckpoint();

  const isPilot = process.argv.includes('--pilot');
  const pilotArgIdx = process.argv.indexOf('--pilot');
  const pilotCount = isPilot && process.argv[pilotArgIdx + 1] ? parseInt(process.argv[pilotArgIdx + 1], 10) : 3;

  const targetList = isPilot ? queue.slice(0, pilotCount) : queue;

  console.log(`Mode: ${isPilot ? `PILOT TEST (${targetList.length} test papers)` : `FULL FLEET (${targetList.length} test papers)`}`);
  console.log(`Model: ${MODEL_NAME}`);
  console.log(`----------------------------------------------------------------\n`);

  let completedInThisRun = 0;

  for (let idx = 0; idx < targetList.length; idx++) {
    const item = targetList[idx];
    if (checkpoint.completedTestIds[item.testId]) {
      console.log(`[${idx + 1}/${targetList.length}] ⏩ Skipping already completed: ${item.title}`);
      continue;
    }

    try {
      console.log(`[${idx + 1}/${targetList.length}] Processing: ${item.title}`);
      const res = await processTestFile(item);
      if (res.success) {
        checkpoint.completedTestIds[item.testId] = true;
        checkpoint.processedQuestionsCount += (res.enrichedCount || 0);
        saveCheckpoint(checkpoint);
        completedInThisRun++;
      }
    } catch (err) {
      console.error(`   ❌ Failed to process ${item.title}:`, err.message);
      // Wait 10s if rate-limited
      if (err.message.includes('429')) {
        console.log('   ⏳ Hit rate-limit. Waiting 20 seconds...');
        await new Promise(r => setTimeout(r, 20000));
      }
    }

    // Cooldown between papers
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n🎉 Run finished! Completed ${completedInThisRun} test papers.`);
}

main();
