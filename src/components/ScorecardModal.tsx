'use client';

import React from 'react';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  BarChart2,
  BookOpen,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { AttemptRecord } from '../lib/analyticsEngine';

interface ScorecardModalProps {
  isOpen: boolean;
  attempt: AttemptRecord | null;
  onViewDeepAnalytics: () => void;
  onReviewSolutions: () => void;
  onReturnToDashboard: () => void;
}

export default function ScorecardModal({
  isOpen,
  attempt,
  onViewDeepAnalytics,
  onReviewSolutions,
  onReturnToDashboard,
}: ScorecardModalProps) {
  if (!isOpen || !attempt) return null;

  const { summary, timeIntelligence, sections, insights } = attempt;

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Header Banner */}
        <div className="bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
              <Trophy size={26} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {attempt.pattern}
                </span>
                <span className="text-xs text-slate-400">
                  Submitted {new Date(attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white mt-0.5">{attempt.testTitle}</h2>
              {attempt.candidateName && (
                <p className="text-xs text-amber-400 font-medium mt-0.5">
                  Candidate: {attempt.candidateName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Top 4 Key Scorecards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Score */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Net Score</span>
                <Target size={14} className="text-blue-400" />
              </span>
              <div className="mt-2">
                <span className="text-2xl md:text-3xl font-extrabold text-blue-400">
                  {summary.netScore}
                </span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">/ {summary.maxMarks}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                +{summary.positiveMarks} | -{summary.negativeMarks}
              </span>
            </div>

            {/* Accuracy */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Accuracy</span>
                <Flame size={14} className={summary.accuracy >= 80 ? 'text-emerald-400' : 'text-amber-400'} />
              </span>
              <div className="mt-2">
                <span className={`text-2xl md:text-3xl font-extrabold ${summary.accuracy >= 80 ? 'text-emerald-400' : summary.accuracy >= 65 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {summary.accuracy}%
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                {summary.correct} correct / {summary.attempted} attempted
              </span>
            </div>

            {/* Questions Attempted */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Attempt Rate</span>
                <CheckCircle2 size={14} className="text-indigo-400" />
              </span>
              <div className="mt-2">
                <span className="text-2xl md:text-3xl font-extrabold text-indigo-300">
                  {summary.attempted}
                </span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">/ {summary.totalQuestions}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                {summary.unattempted} unattempted
              </span>
            </div>

            {/* Time Used */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Active Time</span>
                <Clock size={14} className="text-cyan-400" />
              </span>
              <div className="mt-2">
                <span className="text-xl md:text-2xl font-extrabold text-cyan-300">
                  {formatDuration(attempt.totalTimeSpentSeconds)}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                Avg: {timeIntelligence.avgTimePerQuestionSeconds}s / question
              </span>
            </div>
          </div>

          {/* Dynamic Sectional Performance Table */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <BarChart2 size={16} className="text-blue-400" />
                <span>Sectional Breakdown</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-4">Section Name</th>
                    <th className="py-2.5 px-3 text-center">Attempted</th>
                    <th className="py-2.5 px-3 text-center">Correct</th>
                    <th className="py-2.5 px-3 text-center">Incorrect</th>
                    <th className="py-2.5 px-3 text-center">Accuracy</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-4 text-right">Time Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-300">
                  {sections.map((sec) => (
                    <tr key={sec.sectionId} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{sec.sectionName}</td>
                      <td className="py-3 px-3 text-center">{sec.attemptedCount} / {sec.totalQuestions}</td>
                      <td className="py-3 px-3 text-center text-emerald-400 font-bold">{sec.correctCount}</td>
                      <td className="py-3 px-3 text-center text-rose-400 font-bold">{sec.incorrectCount}</td>
                      <td className="py-3 px-3 text-center font-semibold">
                        <span className={sec.accuracyPercentage >= 80 ? 'text-emerald-400' : sec.accuracyPercentage >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                          {sec.accuracyPercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-400">{sec.netScore}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">{formatDuration(sec.totalTimeSpentSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Insights List */}
          {insights.length > 0 && (
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles size={14} className="text-blue-400" />
                <span>Performance Insights & Observations</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {insights.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-800 px-6 py-4 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onReturnToDashboard}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Dashboard
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onReviewSolutions}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 border border-slate-600"
            >
              <BookOpen size={14} className="text-cyan-400" />
              <span>Review All Solutions</span>
            </button>

            <button
              onClick={onViewDeepAnalytics}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 active:scale-98"
            >
              <BarChart2 size={14} />
              <span>Explore Detailed Analytics</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
