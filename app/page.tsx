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
    setFilterSchool("all");
    setTab("browse");
  };

  const searchResults = useMemo(() => {
    return rankMaterials({
      materials: approvedFeed,
      query: searchQuery,
      school: filterSchool,
      course: filterCourse,
      type: filterType,
      mySchool,
    });
  }, [approvedFeed, filterSchool, filterCourse, filterType, searchQuery, mySchool]);

  const hasSearch = searchQuery.trim().length > 0;

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

              {searchResults.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen size={36} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No scan matched that search.</p>
                  <button
                    onClick={() => { setFilterSchool("all"); setFilterCourse("all"); setFilterType("all"); setSearchQuery(""); }}
                    className="mt-3 text-cyan-300 text-sm hover:text-cyan-200 transition-colors"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {hasSearch && <SearchAnswer query={searchQuery} results={searchResults} />}
                  <p className="text-xs text-slate-600">{searchResults.length} {hasSearch ? "matched scans" : "found"}</p>
                  {searchResults.map((r) => (
                    <MaterialCard
                      key={r.material.id}
                      material={r.material}
                      onOpen={setViewingMaterial}
                      matchReason={hasSearch ? r.reason : undefined}
                      matchedTerms={hasSearch ? r.terms : undefined}
                    />
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

type RankedMaterial = {
  material: StudyMaterial;
  score: number;
  reason: string;
  terms: string[];
};

const STOP_WORDS = new Set(["the", "that", "was", "what", "with", "from", "about", "for", "and", "this", "page", "sheet", "stuff", "thing"]);

const SEMANTIC_TERMS: Record<string, string[]> = {
  chem: ["chemistry", "bonding", "molecule", "stoichiometry", "reaction", "polarity", "vsepr"],
  chemistry: ["bonding", "molecule", "stoichiometry", "reaction", "polarity", "vsepr"],
  shape: ["molecular", "geometry", "vsepr", "shapes"],
  shapes: ["molecular", "geometry", "vsepr", "shape"],
  molecule: ["molecular", "bonding", "polarity", "vsepr"],
  molecules: ["molecular", "bonding", "polarity", "vsepr"],
  bonding: ["bond", "polarity", "intermolecular", "vsepr"],
  bio: ["biology", "cells", "organelles", "membranes", "microscope"],
  biology: ["cells", "organelles", "membranes", "respiration", "mitochondria"],
  cells: ["cell", "organelles", "membrane", "microscope"],
  math: ["functions", "quadratics", "graphs", "trig", "calculus", "derivatives"],
  trig: ["identities", "unit circle", "sin", "cos", "tan"],
  history: ["reconstruction", "civil war", "amendments", "timeline"],
  gov: ["government", "supreme court", "scotus", "constitutional"],
};

function searchTokens(query: string) {
  const raw = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  return Array.from(new Set(raw.flatMap((t) => [t, ...(SEMANTIC_TERMS[t] ?? [])])));
}

function rankMaterials({
  materials,
  query,
  school,
  course,
  type,
  mySchool,
}: {
  materials: StudyMaterial[];
  query: string;
  school: string;
  course: string;
  type: string;
  mySchool: string;
}): RankedMaterial[] {
  const tokens = searchTokens(query);
  const base = materials.filter((m) => {
    if (school !== "all" && m.school !== school) return false;
    if (course !== "all" && m.course !== course) return false;
    if (type !== "all" && m.type !== type) return false;
    return true;
  });

  if (tokens.length === 0) {
    return base
      .slice()
      .sort((a, b) => Number(b.school === mySchool) - Number(a.school === mySchool) || b.upvotes - a.upvotes)
      .map((material) => ({ material, score: 0, reason: "Popular near your school", terms: [] }));
  }

  return base
    .map((material) => {
      const fields = {
        title: material.title.toLowerCase(),
        course: material.course.toLowerCase(),
        tags: material.tags.join(" ").toLowerCase(),
        scan: material.preview.toLowerCase(),
        school: material.school.toLowerCase(),
      };
      let score = material.school === mySchool ? 8 : 0;
      const hits: string[] = [];
      for (const token of tokens) {
        let hit = false;
        if (fields.title.includes(token)) { score += 18; hit = true; }
        if (fields.course.includes(token)) { score += 14; hit = true; }
        if (fields.tags.includes(token)) { score += 12; hit = true; }
        if (fields.scan.includes(token)) { score += 8; hit = true; }
        if (fields.school.includes(token)) { score += 4; hit = true; }
        if (hit) hits.push(token);
      }
      score += Math.min(material.upvotes / 12, 8) + Math.min(material.saves / 18, 6);
      return {
        material,
        score,
        terms: Array.from(new Set(hits)).slice(0, 4),
        reason: buildReason(material, Array.from(new Set(hits))),
      };
    })
    .filter((r) => r.score > 10 && r.terms.length > 0)
    .sort((a, b) => b.score - a.score);
}

function buildReason(material: StudyMaterial, hits: string[]) {
  if (hits.length === 0) return "Locker found this from the scanned page and class details.";
  const readable = hits.slice(0, 3).join(", ");
  return `Matched because the scan mentions ${readable} in ${material.course}.`;
}

function SearchAnswer({ query, results }: { query: string; results: RankedMaterial[] }) {
  const best = results[0];
  if (!best) return null;
  return (
    <div className="rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/[0.055] p-4">
      <div className="mb-3 inline-flex rounded-full bg-cyan-300/10 px-3 py-1 text-[11px] font-medium text-cyan-200">
        Locker AI search
      </div>
      <p className="text-sm leading-6 text-slate-300">
        Found <span className="text-white">{results.length}</span> useful scan{results.length === 1 ? "" : "s"} for “{query.trim()}”.
        Best match is <span className="text-white">{best.material.title}</span>.
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{best.reason}</p>
    </div>
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
