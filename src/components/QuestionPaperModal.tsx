'use client';

import React, { useState } from 'react';
import { X, Layers } from 'lucide-react';
import MathRenderer from './MathRenderer';

interface QuestionPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  testData: any;
  currentSectionIndex: number;
}

export default function QuestionPaperModal({
  isOpen,
  onClose,
  testData,
  currentSectionIndex,
}: QuestionPaperModalProps) {
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number | 'all'>(currentSectionIndex ?? 0);

  if (!isOpen || !testData) return null;

  const sections = testData.sections || [];
  const visibleSections =
    selectedSectionIdx === 'all'
      ? sections
      : [sections[selectedSectionIdx] || sections[0]].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-300">
        {/* Modal Header */}
        <div className="bg-[#2a2a2a] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400 font-semibold text-base">📄 Question Paper</span>
            <span className="text-slate-400 text-sm">| {testData.title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Section Tabs for Instant Rendering and Thread Safety */}
        {sections.length > 1 && (
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center space-x-1.5 overflow-x-auto">
            {sections.map((sec: any, idx: number) => (
              <button
                key={sec.id || idx}
                onClick={() => setSelectedSectionIdx(idx)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedSectionIdx === idx
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {sec.name} ({sec.questions?.length || 0})
              </button>
            ))}
            <button
              onClick={() => setSelectedSectionIdx('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSectionIdx === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              All Sections
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-800">
          {visibleSections.map((sec: any, sIdx: number) => (
            <div key={sIdx} className="border border-slate-200 rounded-md overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-700 border-b border-slate-200 flex justify-between items-center">
                <span>{sec.name}</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">
                  {sec.questions?.length || 0} Questions | {sec.maxMarks || 0} Marks
                </span>
              </div>
              <div className="divide-y divide-slate-100 p-2">
                {(sec.questions || []).map((q: any, qIdx: number) => (
                  <div key={q.id || qIdx} className="py-3 px-2">
                    <div className="font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Q.{q.questionNumber || qIdx + 1}</span>
                      <span className="text-xs text-slate-500 font-normal">
                        Marks: +{q.marks} / -{q.negativeMarks}
                      </span>
                    </div>
                    {(q.passage || q.direction || q.precondition || q.instruction || q.caselet) && (
                      <div className="mb-2.5 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 space-y-1">
                        {q.direction && <MathRenderer content={q.direction} />}
                        {q.passage && <MathRenderer content={q.passage} />}
                        {q.precondition && <MathRenderer content={q.precondition} />}
                        {q.instruction && <MathRenderer content={q.instruction} />}
                        {q.caselet && <MathRenderer content={q.caselet} />}
                      </div>
                    )}
                    <MathRenderer content={q.text} className="text-slate-800 mb-2 leading-relaxed" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                      {(q.options || []).map((opt: any, oIdx: number) => (
                        <div key={opt.id || oIdx} className="flex items-start space-x-2 text-xs text-slate-650">
                          <span className="font-semibold text-slate-500">({opt.label || String.fromCharCode(65 + oIdx)})</span>
                          <MathRenderer content={opt.text} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3 flex justify-end border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
