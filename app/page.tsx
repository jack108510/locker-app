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
import {
  BookOpen, Lock, Users, ShieldCheck, Upload,
  ArrowRight, Star, Zap, Eye
} from "lucide-react";

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

      <div className="min-h-screen flex flex-col max-w-lg mx-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-[#0a0b14]/90 glass border-b border-[#2a2b45] px-4 py-3">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            {onboarded && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1b2e] border border-[#2a2b45]">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
                    <span className="text-xs text-slate-400 font-mono">{pseudonym}</span>
                  </div>
                  {mySchool && <span className="text-[10px] text-slate-600 pr-1">{mySchool}</span>}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 pt-4 pb-nav overflow-y-auto">
          {tab === "home" && (
            <LandingView onGetStarted={() => setTab("browse")} onboard={!onboarded ? undefined : () => setTab("browse")} />
          )}

          {tab === "browse" && (
            <div className="space-y-4">
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
                  <p className="text-xs text-slate-600">{filteredMaterials.length} material{filteredMaterials.length !== 1 ? "s" : ""}</p>
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
              onApproved={(m) => setApprovedFeed((prev) => [m, ...prev])}
              onQueued={(m) => setPendingQueue((prev) => [m, ...prev])}
            />
          )}

          {tab === "admin" && (
            <AdminDashboard approved={approvedFeed} pending={pendingQueue} />
          )}
        </main>

        <BottomNav active={tab} onChange={setTab} />
      </div>
    </>
  );
}

function LandingView({ onGetStarted, onboard }: { onGetStarted: () => void; onboard?: () => void }) {
  return (
    <div className="space-y-10 animate-slide-up">
      {/* Hero */}
      <section className="pt-8 pb-4 text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-400 font-semibold">
          <Zap size={12} fill="currentColor" /> Anonymous by default
        </div>
        <div>
          <h1 className="text-4xl font-black text-white leading-tight mb-3">
            Your school&apos;s<br />
            <span className="gradient-text">study stash.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-xs mx-auto">
            Drop notes, study guides, and flashcards. Stay anonymous. Everything gets reviewed before it goes live.
          </p>
        </div>
        <button
          onClick={onboard ?? onGetStarted}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-base transition-all shadow-lg shadow-indigo-500/25"
        >
          Open your locker <ArrowRight size={18} />
        </button>
        <p className="text-xs text-slate-600">No account. No email. Just pick an alias.</p>
      </section>

      {/* How it works */}
      <section>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-4">How it works</p>
        <div className="space-y-3">
          {[
            { step: "1", title: "Get an alias", body: "You're assigned a random handle like CoolMoose55. No name, no email, no tracking.", icon: <Users size={18} className="text-indigo-400" /> },
            { step: "2", title: "Browse or drop", body: "Search by school, course, or type. Upload notes, guides, and flashcards to share.", icon: <Upload size={18} className="text-purple-400" /> },
            { step: "3", title: "Review before live", body: "Uploads enter a private queue. Prohibited material — exams, answer keys — is blocked automatically.", icon: <ShieldCheck size={18} className="text-emerald-400" /> },
          ].map(({ step, title, body, icon }) => (
            <div key={step} className="flex gap-4 bg-[#12131f] border border-[#2a2b45] rounded-2xl p-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#1a1b2e] flex items-center justify-center">
                {icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What gets dropped */}
      <section>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-4">What gets dropped</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { emoji: "📝", label: "Class notes" },
            { emoji: "📚", label: "Study guides" },
            { emoji: "🃏", label: "Flashcards" },
            { emoji: "❓", label: "Practice Qs" },
            { emoji: "📋", label: "Summaries" },
            { emoji: "🎯", label: "Released prep" },
          ].map(({ emoji, label }) => (
            <div key={label} className="flex items-center gap-2.5 bg-[#12131f] border border-[#2a2b45] rounded-xl px-3 py-2.5">
              <span className="text-lg">{emoji}</span>
              <span className="text-xs text-slate-300 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* What doesn't */}
      <section>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-4">What&apos;s blocked</p>
        <div className="bg-[#12131f] border border-red-500/15 rounded-2xl p-4 space-y-2">
          {[
            "Current or recent exam questions",
            "Answer keys or teacher editions",
            "Graded student work",
            "Private teacher documents",
            "Files with personal student info",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5 text-xs text-slate-500">
              <span className="text-red-500 flex-shrink-0">✕</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Anonymous section */}
      <section className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/20 rounded-3xl p-6 text-center space-y-3">
        <Lock size={28} className="mx-auto text-indigo-400" strokeWidth={1.5} />
        <h2 className="text-lg font-bold text-white">Anonymous by default</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          No accounts. No emails. Aliases are random and not linked to your device. We don&apos;t store IPs. You&apos;re just a handle.
        </p>
        <div className="flex justify-center gap-3 flex-wrap pt-1">
          {["No account", "No IP stored", "No real name", "Random alias"].map((tag) => (
            <span key={tag} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-medium">
              {tag}
            </span>
          ))}
        </div>
      </section>

      {/* Test week */}
      <section className="pb-4">
        <div className="bg-[#12131f] border border-[#2a2b45] rounded-3xl p-5 flex items-start gap-4">
          <Star size={28} className="text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <h2 className="text-base font-bold text-white mb-1">Built for test week</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Locker surfaces the highest-upvoted study material for your school and course, right when you need it. Filter by class, sort by votes, and get studying.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center pb-6">
        <button
          onClick={onboard ?? onGetStarted}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all"
        >
          <Eye size={16} /> Browse the feed
        </button>
      </div>
    </div>
  );
}
