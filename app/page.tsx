"use client";

import { useState, useMemo } from "react";
import { Logo } from "@/components/Logo";
import { BottomNav, NavTab } from "@/components/BottomNav";
import { OnboardingModal } from "@/components/OnboardingModal";
import { SearchFilter } from "@/components/SearchFilter";
import { MaterialCard } from "@/components/MaterialCard";
import { DocumentViewer } from "@/components/DocumentViewer";
import { UploadForm } from "@/components/UploadForm";
import { AdminDashboard } from "@/components/AdminDashboard";
import { APPROVED_MATERIALS, StudyMaterial } from "@/lib/mockData";
import { BookOpen, ArrowRight, MapPin, ScanText } from "lucide-react";

export default function Home() {
  const [onboarded, setOnboarded] = useState(false);
  const [pseudonym, setPseudonym] = useState("");
  const [mySchool, setMySchool] = useState("");
  const [tab, setTab] = useState<NavTab>("home");

  const [approvedFeed, setApprovedFeed] = useState<StudyMaterial[]>(APPROVED_MATERIALS);
  const [pendingQueue, setPendingQueue] = useState<StudyMaterial[]>([]);

  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);

  const [filterSchool, setFilterSchool] = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleOnboardComplete = (p: string, s: string) => {
    setPseudonym(p);
    setMySchool(s);
    setOnboarded(true);
    setFilterSchool(s);
    setTab("browse");
  };

  const filteredMaterials = useMemo(() => {
    return approvedFeed.filter((m) => {
      if (filterSchool !== "all" && m.school !== filterSchool) return false;
      if (filterCourse !== "all" && m.course !== filterCourse) return false;
      if (filterType !== "all" && m.type !== filterType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.course.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [approvedFeed, filterSchool, filterCourse, filterType, searchQuery]);

  return (
    <>
      {!onboarded && <OnboardingModal onComplete={handleOnboardComplete} />}

      {viewingMaterial && (
        <DocumentViewer material={viewingMaterial} onClose={() => setViewingMaterial(null)} />
      )}

      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[#08090d]">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-[#08090d]/85 glass px-5 py-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            {onboarded && mySchool && (
              <div className="max-w-[180px] truncate rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
                {mySchool.replace(" High School", "")}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-5 pt-2 pb-nav overflow-y-auto">
          {tab === "home" && (
            <LandingView onGetStarted={() => setTab("browse")} onboard={!onboarded ? undefined : () => setTab("browse")} />
          )}

          {tab === "browse" && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">Your feed</h1>
                <p className="text-sm text-slate-500">Clean study material near {mySchool.replace(" High School", "") || "you"}.</p>
              </div>
              <SearchFilter
                school={filterSchool}
                onSchoolChange={(s) => { setFilterSchool(s); setFilterCourse("all"); }}
                course={filterCourse}
                onCourseChange={setFilterCourse}
                type={filterType}
                onTypeChange={setFilterType}
                query={searchQuery}
                onQueryChange={setSearchQuery}
              />

              {filteredMaterials.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen size={36} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No materials match your filters.</p>
                  <button
                    onClick={() => { setFilterSchool("all"); setFilterCourse("all"); setFilterType("all"); setSearchQuery(""); }}
                    className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">{filteredMaterials.length} found</p>
                  {filteredMaterials.map((m) => (
                    <MaterialCard key={m.id} material={m} onOpen={setViewingMaterial} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "upload" && (
            <UploadForm
              pseudonym={pseudonym || "Anonymous"}
              currentSchool={mySchool}
              onApproved={(m) => setApprovedFeed((prev) => [m, ...prev])}
              onQueued={(m) => setPendingQueue((prev) => [m, ...prev])}
            />
          )}

          {tab === "admin" && (
            <AdminDashboard approved={approvedFeed} pending={pendingQueue} />
          )}
        </main>

        {onboarded && <BottomNav active={tab} onChange={setTab} />}
      </div>
    </>
  );
}

function LandingView({ onGetStarted, onboard }: { onGetStarted: () => void; onboard?: () => void }) {
  return (
    <div className="animate-slide-up pt-8">
      <section className="min-h-[72vh] flex flex-col justify-between">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
            <MapPin size={13} /> Near your school
          </div>

          <div className="space-y-4">
            <h1 className="text-[3.25rem] font-semibold tracking-[-0.08em] leading-[0.92] text-white">
              Study stuff.<br />Nearby.
            </h1>
            <p className="max-w-[19rem] text-base leading-7 text-slate-400">
              Locker finds your area, shows nearby schools, and lets students scan notes into a clean study feed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <ScanText className="mb-6 text-cyan-300" size={20} />
              <p className="text-sm font-medium text-white">Scan pages</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Pull text from photos.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <BookOpen className="mb-6 text-indigo-300" size={20} />
              <p className="text-sm font-medium text-white">Browse fast</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Notes from your school.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pb-6">
          <button
            onClick={onboard ?? onGetStarted}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-4 text-sm font-semibold text-black transition active:scale-[0.99]"
          >
            Open Locker <ArrowRight size={16} />
          </button>
          <p className="text-center text-xs text-slate-600">Anonymous alias · location used once · uploads reviewed</p>
        </div>
      </section>
    </div>
  );
}
