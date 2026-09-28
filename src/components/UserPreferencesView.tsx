'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  RotateCcw,
  Check,
  Building2,
  Landmark,
  Train,
  Shield,
  GraduationCap,
  Scale,
  Award,
  BookOpen,
  Filter,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';

export interface UserPreferences {
  selectedDomains: string[]; // Category IDs e.g. ['ssc', 'banking', 'civil_services']
  selectedSubdomains: string[]; // Exam IDs e.g. ['ssc_cgl', 'ssc_maths_pyp', 'sbi_po']
}

interface UserPreferencesViewProps {
  manifest: any;
  currentPreferences: UserPreferences | null;
  onSavePreferences: (prefs: UserPreferences) => void;
  onClose: () => void;
}

export default function UserPreferencesView({
  manifest,
  currentPreferences,
  onSavePreferences,
  onClose,
}: UserPreferencesViewProps) {
  const domains = manifest?.categories || manifest?.domains || [];

  const [selectedDomains, setSelectedDomains] = useState<string[]>(() => {
    if (currentPreferences && currentPreferences.selectedDomains?.length > 0) {
      return currentPreferences.selectedDomains;
    }
    return domains.map((d: any) => d.id);
  });

  const [selectedSubdomains, setSelectedSubdomains] = useState<string[]>(() => {
    if (currentPreferences && currentPreferences.selectedSubdomains?.length > 0) {
      return currentPreferences.selectedSubdomains;
    }
    const allSubs: string[] = [];
    for (const d of domains) {
      const exams = d.exams || d.categories || [];
      for (const ex of exams) {
        allSubs.push(ex.id);
      }
    }
    return allSubs;
  });

  // Ensure all domains/subdomains are selected if manifest loads after component mount
  React.useEffect(() => {
    if (domains && domains.length > 0) {
      if (currentPreferences && currentPreferences.selectedDomains?.length > 0) {
        setSelectedDomains(currentPreferences.selectedDomains);
      } else {
        setSelectedDomains(domains.map((d: any) => d.id));
      }

      if (currentPreferences && currentPreferences.selectedSubdomains?.length > 0) {
        setSelectedSubdomains(currentPreferences.selectedSubdomains);
      } else {
        const allSubs: string[] = [];
        for (const d of domains) {
          const exams = d.exams || d.categories || [];
          for (const ex of exams) {
            allSubs.push(ex.id);
          }
        }
        setSelectedSubdomains(allSubs);
      }
    }
  }, [manifest, currentPreferences]);

  // Track expanded domain accordion for sub-selection
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);

  const getDomainIcon = (id: string) => {
    switch (id) {
      case 'banking': return <Landmark className="w-5 h-5 text-emerald-400" />;
      case 'civil_services': return <GraduationCap className="w-5 h-5 text-amber-400" />;
      case 'regulatory': return <Scale className="w-5 h-5 text-purple-400" />;
      case 'defense': return <Shield className="w-5 h-5 text-red-400" />;
      case 'ssc': return <Award className="w-5 h-5 text-blue-400" />;
      case 'state_psc': return <Building2 className="w-5 h-5 text-orange-400" />;
      case 'railways': return <Train className="w-5 h-5 text-cyan-400" />;
      default: return <BookOpen className="w-5 h-5 text-slate-400" />;
    }
  };

  const toggleDomain = (domainId: string) => {
    if (selectedDomains.includes(domainId)) {
      // Deselect domain and its subdomains
      setSelectedDomains(prev => prev.filter(id => id !== domainId));
      const domainObj = domains.find((d: any) => d.id === domainId);
      if (domainObj) {
        const exams = domainObj.exams || domainObj.categories || [];
        const examIds = exams.map((e: any) => e.id);
        setSelectedSubdomains(prev => prev.filter(id => !examIds.includes(id)));
      }
      if (expandedDomainId === domainId) setExpandedDomainId(null);
    } else {
      // Select domain and all its subdomains
      setSelectedDomains(prev => [...prev, domainId]);
      const domainObj = domains.find((d: any) => d.id === domainId);
      if (domainObj) {
        const exams = domainObj.exams || domainObj.categories || [];
        const examIds = exams.map((e: any) => e.id);
        setSelectedSubdomains(prev => Array.from(new Set([...prev, ...examIds])));
      }
    }
  };

  const toggleSubdomain = (examId: string, domainId: string) => {
    if (selectedSubdomains.includes(examId)) {
      const nextSubs = selectedSubdomains.filter(id => id !== examId);
      setSelectedSubdomains(nextSubs);
      // If no subdomains left in this domain, deselect domain
      const domainObj = domains.find((d: any) => d.id === domainId);
      const exams = domainObj?.exams || domainObj?.categories || [];
      const examIds = exams.map((e: any) => e.id);
      const hasAny = examIds.some((id: string) => nextSubs.includes(id));
      if (!hasAny) {
        setSelectedDomains(prev => prev.filter(id => id !== domainId));
      }
    } else {
      setSelectedSubdomains(prev => [...prev, examId]);
      if (!selectedDomains.includes(domainId)) {
        setSelectedDomains(prev => [...prev, domainId]);
      }
    }
  };

  const selectAllSubdomainsInDomain = (domainId: string) => {
    const domainObj = domains.find((d: any) => d.id === domainId);
    if (!domainObj) return;
    const exams = domainObj.exams || domainObj.categories || [];
    const examIds = exams.map((e: any) => e.id);
    setSelectedSubdomains(prev => Array.from(new Set([...prev, ...examIds])));
    if (!selectedDomains.includes(domainId)) {
      setSelectedDomains(prev => [...prev, domainId]);
    }
  };

  const deselectAllSubdomainsInDomain = (domainId: string) => {
    const domainObj = domains.find((d: any) => d.id === domainId);
    if (!domainObj) return;
    const exams = domainObj.exams || domainObj.categories || [];
    const examIds = exams.map((e: any) => e.id);
    setSelectedSubdomains(prev => prev.filter(id => !examIds.includes(id)));
    setSelectedDomains(prev => prev.filter(id => id !== domainId));
  };

  const handleSelectAll = () => {
    const allDoms = domains.map((d: any) => d.id);
    const allSubs: string[] = [];
    for (const d of domains) {
      const exams = d.exams || d.categories || [];
      for (const ex of exams) {
        allSubs.push(ex.id);
      }
    }
    setSelectedDomains(allDoms);
    setSelectedSubdomains(allSubs);
  };

  const handleSave = () => {
    if (selectedDomains.length === 0) {
      return;
    }
    onSavePreferences({
      selectedDomains,
      selectedSubdomains,
    });
    onClose();
  };

  // Compute total selected test count
  let totalSelectedTests = 0;
  for (const d of domains) {
    if (selectedDomains.includes(d.id)) {
      const exams = d.exams || d.categories || [];
      for (const ex of exams) {
        if (selectedSubdomains.includes(ex.id)) {
          totalSelectedTests += (ex.totalTests || ex.testCount || 0);
        }
      }
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#f4f5f8] dark:bg-[#0f1015] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans select-none pb-24 transition-colors duration-200">
      {/* 1. COMPACT MOBILE-FIRST TOP APP BAR */}
      <header className="bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border-b border-zinc-200 dark:border-[#27272a] px-3.5 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onClose}
            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] active:scale-95 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all flex items-center justify-center cursor-pointer border border-zinc-200 dark:border-transparent"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm font-bold text-zinc-900 dark:text-white tracking-wide">Target Exam Goals</h1>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-[#0858f7]/10 dark:bg-[#0858f7]/15 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/30">
                {selectedDomains.length}/{domains.length} Active
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Pick the exam categories you want on your dashboard
            </p>
          </div>
        </div>

        <button
          onClick={handleSelectAll}
          className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#27272a] dark:hover:bg-[#3f3f46] active:scale-95 text-zinc-700 dark:text-zinc-300 rounded-xl text-[11px] font-semibold transition-all flex items-center space-x-1 border border-zinc-200 dark:border-[#3f3f46]/60 cursor-pointer shadow-xs"
        >
          <RotateCcw size={12} />
          <span>All</span>
        </button>
      </header>

      {/* 2. DOMAIN SELECTION CARDS */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {domains.map((dom: any) => {
            const isSelected = selectedDomains.includes(dom.id);
            const isExpanded = expandedDomainId === dom.id;
            const exams = dom.exams || dom.categories || [];
            const selectedExamsCount = exams.filter((e: any) => selectedSubdomains.includes(e.id)).length;
            const totalDomainTests = exams.reduce((acc: number, e: any) => acc + (e.totalTests || e.testCount || 0), 0);

            return (
              <div
                key={dom.id}
                className={`rounded-2xl border transition-all duration-150 overflow-hidden flex flex-col ${
                  isSelected
                    ? 'bg-white dark:bg-[#18181b] border-[#0858f7]/50 shadow-xs dark:shadow-md ring-1 ring-[#0858f7]/20'
                    : 'bg-white/60 dark:bg-[#18181b]/50 border-zinc-200 dark:border-[#27272a] opacity-70'
                }`}
              >
                {/* Domain Header Row */}
                <div
                  className="p-3.5 flex items-center justify-between cursor-pointer active:bg-zinc-100 dark:active:bg-[#27272a]"
                  onClick={() => toggleDomain(dom.id)}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-[#27272a] border border-zinc-200 dark:border-[#3f3f46]/60 flex items-center justify-center shrink-0">
                      {getDomainIcon(dom.id)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xs md:text-sm text-zinc-900 dark:text-white truncate">
                        {dom.name}
                      </h3>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center space-x-1.5 mt-0.5">
                        <span>{exams.length} Exams</span>
                        <span>•</span>
                        <span className="font-mono text-[#0858f7] dark:text-[#60a5fa] font-semibold">{totalDomainTests.toLocaleString()} Tests</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Check Indicator */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      isSelected ? 'bg-[#0858f7] text-white shadow-xs' : 'bg-zinc-100 dark:bg-[#27272a] border border-zinc-300 dark:border-[#3f3f46] text-transparent'
                    }`}>
                      <Check size={13} strokeWidth={3} />
                    </div>
                  </div>
                </div>

                {/* Subdomain Expand Button */}
                {isSelected && exams.length > 0 && (
                  <div className="px-3.5 py-2 bg-zinc-50/80 dark:bg-[#121214]/60 border-t border-zinc-200 dark:border-[#27272a] flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDomainId(isExpanded ? null : dom.id);
                      }}
                      className="text-[11px] font-medium text-[#0858f7] dark:text-[#60a5fa] hover:underline flex items-center space-x-1 transition-colors cursor-pointer py-0.5"
                    >
                      <SlidersHorizontal size={12} />
                      <span>{selectedExamsCount}/{exams.length} papers selected</span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {isExpanded && (
                      <div className="flex items-center space-x-2 text-[10px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAllSubdomainsInDomain(dom.id);
                          }}
                          className="text-[#0858f7] dark:text-[#60a5fa] hover:underline font-semibold cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-zinc-300 dark:text-zinc-600">•</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deselectAllSubdomainsInDomain(dom.id);
                          }}
                          className="text-zinc-500 dark:text-zinc-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded Sub-Exams Pills */}
                {isSelected && isExpanded && (
                  <div className="p-3 bg-zinc-50 dark:bg-[#121214] border-t border-zinc-200 dark:border-[#27272a] flex flex-wrap gap-1.5">
                    {exams.map((ex: any) => {
                      const isExamSelected = selectedSubdomains.includes(ex.id);
                      return (
                        <button
                          key={ex.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSubdomain(ex.id, dom.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center space-x-1.5 cursor-pointer ${
                            isExamSelected
                              ? 'bg-[#0858f7]/10 dark:bg-[#0858f7]/20 text-[#0858f7] dark:text-[#60a5fa] border border-[#0858f7]/40 font-semibold'
                              : 'bg-white dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-[#27272a] hover:text-zinc-900 dark:hover:text-zinc-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isExamSelected ? 'bg-[#0858f7]' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                          <span>{ex.name}</span>
                          {(ex.totalTests || ex.testCount) > 0 && (
                            <span className="text-[9px] font-mono opacity-70">
                              ({ex.totalTests || ex.testCount})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* 3. STICKY BOTTOM SAVE & APPLY BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-lg border-t border-zinc-200 dark:border-[#27272a] flex items-center justify-between safe-bottom shadow-lg z-40">
        <div className="pl-1">
          <div className="text-xs font-bold text-zinc-900 dark:text-white">
            {totalSelectedTests.toLocaleString()} Tests Available
          </div>
          <div className="text-[10px] text-[#0858f7] dark:text-[#60a5fa] font-semibold">
            {selectedDomains.length} categories active
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={selectedDomains.length === 0}
          className="px-5 py-2.5 bg-[#0858f7] hover:bg-[#0645c7] active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[#0858f7]/25 flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
        >
          <Check size={15} strokeWidth={2.5} />
          <span>Save & Apply Goals</span>
        </button>
      </div>
    </div>
  );
}
