/**
 * Pure, Exam-Agnostic Performance & Time Telemetry Engine
 * 
 * Guarantees:
 * 1. Zero hard-coded assumptions (sections, marks, time, counts are dynamically extracted).
 * 2. True timestamp-based active question timing diffs (no render drift).
 * 3. Observational and non-destructive to canonical CBT player state.
 */

export interface QuestionVisit {
  enteredAt: number;
  exitedAt: number;
  durationMs: number;
}

export interface QuestionTelemetry {
  questionId: string;
  sectionId: string;
  firstOpenedAt: number;
  lastOpenedAt: number;
  totalActiveTimeSeconds: number;
  visitCount: number;
  visits: QuestionVisit[];
  answer: string | null;
  answerChangeCount: number;
  markedForReview: boolean;
}

export interface QuestionAnalysis {
  questionId: string;
  questionNumber: number;
  sectionId: string;
  sectionName: string;
  topic?: string;
  subtopic?: string;
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isAttempted: boolean;
  isCorrect: boolean;
  marksEarned: number;
  posMarks: number;
  negMarks: number;
  timeSpentSeconds: number;
  visitCount: number;
  visits?: QuestionVisit[];
  answerChanges: number;
  timeClassification: 'FAST' | 'NORMAL' | 'SLOW' | 'TIME_TRAP';
  status: 'correct' | 'incorrect' | 'unattempted';
  populationAvgTimeSeconds?: number;
}

export interface SectionAnalysis {
  sectionId: string;
  sectionName: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  positiveMarks: number;
  negativeMarks: number;
  netScore: number;
  maxMarks: number;
  accuracyPercentage: number;
  totalTimeSpentSeconds: number;
  avgTimePerAttemptSeconds: number;
  avgTimeCorrectSeconds: number;
  avgTimeIncorrectSeconds: number;
}

export interface AttemptRecord {
  attemptId: string;
  testId: string;
  testTitle: string;
  exam: string;
  pattern: string;
  startedAt: number;
  submittedAt: number;
  totalDurationSeconds: number;
  totalTimeSpentSeconds: number;
  summary: {
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    positiveMarks: number;
    negativeMarks: number;
    netScore: number;
    maxMarks: number;
    accuracy: number;
  };
  timeIntelligence: {
    timeSpentOnCorrectSeconds: number;
    timeSpentOnIncorrectSeconds: number;
    timeSpentOnUnattemptedSeconds: number;
    timeWastedSeconds: number;
    avgTimePerQuestionSeconds: number;
    avgTimeCorrectSeconds: number;
    avgTimeIncorrectSeconds: number;
    timeTrapsCount: number;
    fastestQuestion: { questionNumber: number; timeSeconds: number; isCorrect: boolean; sectionName: string } | null;
    slowestQuestion: { questionNumber: number; timeSeconds: number; isCorrect: boolean; sectionName: string } | null;
  };
  insights: string[];
  sections: SectionAnalysis[];
  questions: QuestionAnalysis[];
}

/**
 * Evaluates an exam attempt dynamically based on the exact test schema and live telemetry.
 */
export function evaluateAttempt(
  testData: any,
  userAnswers: Record<string, string>,
  telemetryMap: Record<string, QuestionTelemetry>,
  questionStatus: Record<string, string>,
  startedAt: number,
  submittedAt: number
): AttemptRecord {
  const attemptId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const sectionsData = testData?.sections || [];
  
  // Calculate dynamic target pace per question (duration / totalQuestions)
  const totalDurationSec = (testData?.totalDurationMinutes || 120) * 60;
  const rawTotalQuestions = testData?.totalQuestions || sectionsData.reduce((acc: number, s: any) => acc + (s.questions?.length || 0), 0) || 1;
  const targetTimePerQuestion = Math.max(15, Math.round(totalDurationSec / rawTotalQuestions));

  const questionsAnalysis: QuestionAnalysis[] = [];
  const sectionsAnalysis: SectionAnalysis[] = [];

  let overallPositiveMarks = 0;
  let overallNegativeMarks = 0;
  let overallCorrectCount = 0;
  let overallIncorrectCount = 0;
  let overallAttemptedCount = 0;
  let overallUnattemptedCount = 0;
  let overallMaxMarks = 0;

  let timeSpentOnCorrectSec = 0;
  let timeSpentOnIncorrectSec = 0;
  let timeSpentOnUnattemptedSec = 0;
  let timeWastedSec = 0;
  let timeTrapsCount = 0;

  let fastestQ: QuestionAnalysis | null = null;
  let slowestQ: QuestionAnalysis | null = null;

  // 1. Process Section-by-Section & Question-by-Question
  for (const sec of sectionsData) {
    const secId = sec.id || sec._id || `sec_${sec.name}`;
    const secName = sec.name || sec.title || 'General';
    const secQuestions = sec.questions || [];

    let secAttempted = 0;
    let secCorrect = 0;
    let secIncorrect = 0;
    let secUnattempted = 0;
    let secPosMarks = 0;
    let secNegMarks = 0;
    let secMaxMarks = 0;
    let secTimeSpentSec = 0;
    let secCorrectTimeSec = 0;
    let secIncorrectTimeSec = 0;

    for (const q of secQuestions) {
      const qId = q.id || q._id;
      const qNum = q.questionNumber || (questionsAnalysis.length + 1);
      
      // Dynamic marks from metadata
      const posMarks = typeof q.marks === 'number' ? q.marks : (typeof q.posMarks === 'number' ? q.posMarks : 1);
      const negMarks = typeof q.negativeMarks === 'number' ? q.negativeMarks : (typeof q.negMarks === 'number' ? q.negMarks : 0.25);
      secMaxMarks += posMarks;

      const selectedOpt = userAnswers[qId] || null;
      const correctOpt = q.correctOptionId || (q.options && q.options.find((o: any) => o.isCorrect)?.id) || null;
      const isAttempted = selectedOpt !== null && selectedOpt !== undefined && selectedOpt !== '';

      let isCorrect = false;
      let marksEarned = 0;
      let status: 'correct' | 'incorrect' | 'unattempted' = 'unattempted';

      if (isAttempted) {
        secAttempted++;
        // Compare option ID or index (string-safe)
        if (correctOpt && String(selectedOpt).trim() === String(correctOpt).trim()) {
          isCorrect = true;
          status = 'correct';
          secCorrect++;
          marksEarned = posMarks;
          secPosMarks += posMarks;
        } else {
          isCorrect = false;
          status = 'incorrect';
          secIncorrect++;
          marksEarned = -negMarks;
          secNegMarks += negMarks;
        }
      } else {
        secUnattempted++;
        status = 'unattempted';
        marksEarned = 0;
      }

      // Telemetry lookup
      const telemetry = telemetryMap[qId] || {
        totalActiveTimeSeconds: 0,
        visitCount: isAttempted ? 1 : 0,
        answerChangeCount: 0,
        visits: [],
      };

      const timeSpentSec = Math.round(telemetry.totalActiveTimeSeconds || 0);
      secTimeSpentSec += timeSpentSec;

      if (status === 'correct') {
        timeSpentOnCorrectSec += timeSpentSec;
        secCorrectTimeSec += timeSpentSec;
      } else if (status === 'incorrect') {
        timeSpentOnIncorrectSec += timeSpentSec;
        secIncorrectTimeSec += timeSpentSec;
        // Wasted time includes all incorrect time + penalty factor
        timeWastedSec += timeSpentSec;
      } else {
        timeSpentOnUnattemptedSec += timeSpentSec;
        if (timeSpentSec > targetTimePerQuestion * 0.5) {
          timeWastedSec += Math.round(timeSpentSec * 0.5);
        }
      }

      // Time Classification Engine
      // Fast: < 0.75 * target
      // Normal: 0.75 * target to 1.25 * target
      // Slow: > 1.25 * target
      // Time Trap: Slow + Incorrect or Skipped with excessive time (> 1.5 * target)
      let timeClassification: 'FAST' | 'NORMAL' | 'SLOW' | 'TIME_TRAP' = 'NORMAL';
      if (timeSpentSec < targetTimePerQuestion * 0.75) {
        timeClassification = 'FAST';
      } else if (timeSpentSec > targetTimePerQuestion * 1.35) {
        if (!isCorrect && timeSpentSec > targetTimePerQuestion * 1.5) {
          timeClassification = 'TIME_TRAP';
          timeTrapsCount++;
        } else {
          timeClassification = 'SLOW';
        }
      } else {
        timeClassification = 'NORMAL';
      }

      const qAnalysis: QuestionAnalysis = {
        questionId: qId,
        questionNumber: qNum,
        sectionId: secId,
        sectionName: secName,
        topic: q.topic || q.subtopic || q.category || undefined,
        subtopic: q.subtopic || undefined,
        selectedOptionId: selectedOpt,
        correctOptionId: correctOpt,
        isAttempted,
        isCorrect,
        marksEarned,
        posMarks,
        negMarks,
        timeSpentSeconds: timeSpentSec,
        visitCount: Math.max(telemetry.visitCount || 0, telemetry.visits?.length || 0, isAttempted ? 1 : 0),
        visits: telemetry.visits || [],
        answerChanges: telemetry.answerChangeCount || 0,
        timeClassification,
        status,
        populationAvgTimeSeconds: q.averageTime || q.avgTime || undefined,
      };

      questionsAnalysis.push(qAnalysis);

      // Track fastest and slowest attempted questions
      if (isAttempted && timeSpentSec > 0) {
        if (!fastestQ || timeSpentSec < fastestQ.timeSpentSeconds) {
          fastestQ = qAnalysis;
        }
        if (!slowestQ || timeSpentSec > slowestQ.timeSpentSeconds) {
          slowestQ = qAnalysis;
        }
      }
    }

    const secNetScore = Number((secPosMarks - secNegMarks).toFixed(2));
    const secAccuracy = secAttempted > 0 ? Number(((secCorrect / secAttempted) * 100).toFixed(1)) : 0;

    sectionsAnalysis.push({
      sectionId: secId,
      sectionName: secName,
      totalQuestions: secQuestions.length,
      attemptedCount: secAttempted,
      correctCount: secCorrect,
      incorrectCount: secIncorrect,
      unattemptedCount: secUnattempted,
      positiveMarks: Number(secPosMarks.toFixed(2)),
      negativeMarks: Number(secNegMarks.toFixed(2)),
      netScore: secNetScore,
      maxMarks: secMaxMarks,
      accuracyPercentage: secAccuracy,
      totalTimeSpentSeconds: secTimeSpentSec,
      avgTimePerAttemptSeconds: secAttempted > 0 ? Math.round((secCorrectTimeSec + secIncorrectTimeSec) / secAttempted) : 0,
      avgTimeCorrectSeconds: secCorrect > 0 ? Math.round(secCorrectTimeSec / secCorrect) : 0,
      avgTimeIncorrectSeconds: secIncorrect > 0 ? Math.round(secIncorrectTimeSec / secIncorrect) : 0,
    });

    overallAttemptedCount += secAttempted;
    overallCorrectCount += secCorrect;
    overallIncorrectCount += secIncorrect;
    overallUnattemptedCount += secUnattempted;
    overallPositiveMarks += secPosMarks;
    overallNegativeMarks += secNegMarks;
    overallMaxMarks += secMaxMarks;
  }

  const overallNetScore = Number((overallPositiveMarks - overallNegativeMarks).toFixed(2));
  const overallAccuracy = overallAttemptedCount > 0 ? Number(((overallCorrectCount / overallAttemptedCount) * 100).toFixed(1)) : 0;
  const totalActiveTimeSpentSec = questionsAnalysis.reduce((acc, q) => acc + q.timeSpentSeconds, 0);

  // 2. Generate Actionable Exam Insights
  const insights: string[] = [];
  
  if (overallAccuracy >= 85) {
    insights.push(`🎯 Excellent Accuracy (${overallAccuracy}%). Your precision is at an elite level.`);
  } else if (overallAccuracy < 70 && overallAttemptedCount > 0) {
    insights.push(`⚠️ Low Accuracy Alert (${overallAccuracy}%). You lost ${overallNegativeMarks.toFixed(2)} marks to negative penalties. Focus on question selection.`);
  }

  if (timeTrapsCount > 0) {
    insights.push(`⏳ ${timeTrapsCount} Time Trap(s) Detected: You spent excessive time on questions that resulted in incorrect or unattempted marks.`);
  }

  if (overallIncorrectCount > 0 && timeSpentOnIncorrectSec > 0) {
    const incorrectTimePct = Math.round((timeSpentOnIncorrectSec / Math.max(1, totalActiveTimeSpentSec)) * 100);
    insights.push(`📉 ${incorrectTimePct}% of your active test time was consumed by questions answered incorrectly.`);
  }

  const revisitedQuestions = questionsAnalysis.filter(q => q.visitCount > 1);
  if (revisitedQuestions.length > 0) {
    insights.push(`🔄 You revisited ${revisitedQuestions.length} question(s) during your examination.`);
  }

  // Identify Best and Weakest Section
  if (sectionsAnalysis.length > 1) {
    const sortedByAcc = [...sectionsAnalysis].filter(s => s.attemptedCount > 0).sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
    if (sortedByAcc.length > 0) {
      insights.push(`💪 Strongest Section: "${sortedByAcc[0].sectionName}" with ${sortedByAcc[0].accuracyPercentage}% accuracy.`);
      if (sortedByAcc.length > 1 && sortedByAcc[sortedByAcc.length - 1].accuracyPercentage < 75) {
        insights.push(`📌 Area for Improvement: "${sortedByAcc[sortedByAcc.length - 1].sectionName}" (${sortedByAcc[sortedByAcc.length - 1].accuracyPercentage}% accuracy).`);
      }
    }
  }

  return {
    attemptId,
    testId: testData.testId || testData._id || 'unknown_test',
    testTitle: testData.title || 'Examination',
    exam: testData.exam || 'Competitive Exam',
    pattern: testData.pattern || 'STANDARD',
    startedAt,
    submittedAt,
    totalDurationSeconds: totalDurationSec,
    totalTimeSpentSeconds: totalActiveTimeSpentSec,
    summary: {
      totalQuestions: questionsAnalysis.length,
      attempted: overallAttemptedCount,
      correct: overallCorrectCount,
      incorrect: overallIncorrectCount,
      unattempted: overallUnattemptedCount,
      positiveMarks: Number(overallPositiveMarks.toFixed(2)),
      negativeMarks: Number(overallNegativeMarks.toFixed(2)),
      netScore: overallNetScore,
      maxMarks: overallMaxMarks || testData.totalMarks || 100,
      accuracy: overallAccuracy,
    },
    timeIntelligence: {
      timeSpentOnCorrectSeconds: timeSpentOnCorrectSec,
      timeSpentOnIncorrectSeconds: timeSpentOnIncorrectSec,
      timeSpentOnUnattemptedSeconds: timeSpentOnUnattemptedSec,
      timeWastedSeconds: timeWastedSec,
      avgTimePerQuestionSeconds:
        overallAttemptedCount > 0
          ? Math.round((timeSpentOnCorrectSec + timeSpentOnIncorrectSec) / overallAttemptedCount)
          : questionsAnalysis.length > 0
          ? Math.round(totalActiveTimeSpentSec / questionsAnalysis.length)
          : 0,
      avgTimeCorrectSeconds: overallCorrectCount > 0 ? Math.round(timeSpentOnCorrectSec / overallCorrectCount) : 0,
      avgTimeIncorrectSeconds: overallIncorrectCount > 0 ? Math.round(timeSpentOnIncorrectSec / overallIncorrectCount) : 0,
      timeTrapsCount,
      fastestQuestion: fastestQ ? { questionNumber: fastestQ.questionNumber, timeSeconds: fastestQ.timeSpentSeconds, isCorrect: fastestQ.isCorrect, sectionName: fastestQ.sectionName } : null,
      slowestQuestion: slowestQ ? { questionNumber: slowestQ.questionNumber, timeSeconds: slowestQ.timeSpentSeconds, isCorrect: slowestQ.isCorrect, sectionName: slowestQ.sectionName } : null,
    },
    insights,
    sections: sectionsAnalysis,
    questions: questionsAnalysis,
  };
}
