'use client';

import React from 'react';
import { X, Info } from 'lucide-react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  testData: any;
  isStarter?: boolean;
  onBegin?: () => void;
}

export default function InstructionsModal({
  isOpen,
  onClose,
  testData,
  isStarter = false,
  onBegin,
}: InstructionsModalProps) {
  if (!isOpen || !testData) return null;

  const isCGL = 
    /cgl/i.test(testData.exam || '') || 
    /cgl/i.test(testData.title || '') || 
    /cgl/i.test(testData.testId || '');
  const hasFourSections = testData.sections?.length === 4;
  const isCGLFourSection = isCGL && hasFourSections;
  const hasSectionalTimer = 
    testData.hasSectionalTiming ||
    isCGLFourSection ||
    testData.pattern === 'NEW_PATTERN_2026' ||
    (testData.sections?.length > 1 && testData.sections.some((s: any) => typeof s.durationMinutes === 'number' && s.durationMinutes > 0));

  const sectionDuration = isCGLFourSection 
    ? 15 
    : (testData.sections?.[0]?.durationMinutes || (testData.pattern === 'NEW_PATTERN_2026' ? (testData.sections?.length === 4 ? 15 : 20) : null));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-300">
        {/* Modal Header */}
        <div className="bg-[#2a2a2a] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info size={18} className="text-cyan-400" />
            <span className="text-cyan-400 font-semibold text-base">Examination Instructions & Scheme</span>
          </div>
          {!isStarter && (
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-800 leading-relaxed">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-1">{testData.title}</h4>
            <p className="text-xs text-blue-700 font-mono">
              Pattern: {testData.pattern} | Total Questions: {testData.totalQuestions} | Total Duration: {testData.totalDurationMinutes} Minutes
              {hasSectionalTimer && sectionDuration && ` | Sectional Timing: ${sectionDuration}m / section`}
            </p>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-slate-800 border-b pb-1 text-sm">General Instructions:</h5>
            <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-600">
              <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.</li>
              <li>When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
              {hasSectionalTimer && sectionDuration && (
                <li className="font-semibold text-amber-800 bg-amber-50 p-2 rounded">
                  ⚠️ <strong>Sectional Timing Rule {isCGLFourSection ? '(SSC CGL 2026 Updated Scheme)' : '(Official Pattern)'}:</strong> Each section is strictly timed for <strong>{sectionDuration} Minutes</strong>. You cannot switch to other sections until the active section timer expires!
                </li>
              )}
            </ol>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-slate-800 border-b pb-1 text-sm">Marking Scheme:</h5>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200 rounded">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-2 border-b">Section / Subject</th>
                    <th className="p-2 border-b text-center">Correct Mark</th>
                    <th className="p-2 border-b text-center">Negative Mark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-2">English / Reasoning / Quant / GA</td>
                    <td className="p-2 text-center text-emerald-600 font-bold">+1.00</td>
                    <td className="p-2 text-center text-rose-600 font-bold">-0.25 (1/4th)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-blue-700">Professional Knowledge (IT Officer 2026)</td>
                    <td className="p-2 text-center text-emerald-600 font-bold">+2.00</td>
                    <td className="p-2 text-center text-rose-600 font-bold">-0.50 (1/4th)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-slate-800 border-b pb-1 text-sm">Question Palette Legend:</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-slate-200 border border-slate-400 rounded flex items-center justify-center font-bold text-slate-700 text-[10px]">1</div>
                <span>You have not visited the question yet.</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-red-600 text-white rounded-b-md flex items-center justify-center font-bold text-[10px]">2</div>
                <span>You have not answered the question.</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-600 text-white rounded-t-md flex items-center justify-center font-bold text-[10px]">3</div>
                <span>You have answered the question.</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">4</div>
                <span>You have marked the question for review.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 flex justify-end items-center space-x-3 border-t border-slate-200">
          {isStarter ? (
            <button
              onClick={onBegin || onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm shadow-md transition-all active:scale-98"
            >
              Begin Exam
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
            >
              I Understand
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
