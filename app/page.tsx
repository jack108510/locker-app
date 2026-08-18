"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Logo } from "@/components/Logo";
import { BottomNav, NavTab } from "@/components/BottomNav";
import { OnboardingModal } from "@/components/OnboardingModal";
import { SearchFilter } from "@/components/SearchFilter";
import { MaterialCard } from "@/components/MaterialCard";
import { DocumentViewer } from "@/components/DocumentViewer";
import { UploadForm } from "@/components/UploadForm";
import { AdminDashboard } from "@/components/AdminDashboard";
import { APPROVED_MATERIALS, COMMUNITY_STATS, StudyMaterial } from "@/lib/mockData";
import { loadApprovedMaterials, loadCommunityStats, upsertProfile } from "@/lib/lockerData";
import { supabaseConfigured } from "@/lib/supabase";
import { Archive, ArrowRight, Database, ScanText, Lock, UserRound, ShieldCheck } from "lucide-react";

type LockerUser = {
  username: string;
  pseudonym: string;
  school: string;
  profileId?: string;
};

const USERS_KEY = "locker-users-v1";
const SESSION_KEY = "locker-session-v1";
const BLOCKED_SOURCES_KEY = "locker-blocked-sources-v1";

export default function Home() {
  const [onboarded, setOnboarded] = useState(false);
  const [pseudonym, setPseudonym] = useState("");
  const [mySchool, setMySchool] = useState("");
  const [user, setUser] = useState<LockerUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileId, setProfileId] = useState<string | undefined>();
  const [communityStats, setCommunityStats] = useState(COMMUNITY_STATS);
  const [dataStatus, setDataStatus] = useState<"loading" | "live" | "offline">(supabaseConfigured ? "loading" : "offline");
  const [tab, setTab] = useState<NavTab>("home");

  const [approvedFeed, setApprovedFeed] = useState<StudyMaterial[]>(APPROVED_MATERIALS);
  const [pendingQueue, setPendingQueue] = useState<StudyMaterial[]>([]);

  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);

  const [filterSchool, setFilterSchool] = useState("all");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [blockedSources, setBlockedSources] = useState<string[]>([]);

  useEffect(() => {
    // localStorage hydration is the whole point of this prototype login.
    const sessionUsername = window.localStorage.getItem(SESSION_KEY);
    const users = readUsers();
    const savedUser = users.find((u) => u.username === sessionUsername);
    if (savedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(savedUser);
      setPseudonym(savedUser.pseudonym);
      setMySchool(savedUser.school);
      setProfileId(savedUser.profileId);
      setOnboarded(Boolean(savedUser.school));
      setTab(savedUser.school ? "browse" : "home");
    }
    setBlockedSources(readBlockedSources());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadLiveData() {
      if (!supabaseConfigured || !mySchool) return;
      try {
        const [materials, stats] = await Promise.all([loadApprovedMaterials(mySchool), loadCommunityStats(mySchool)]);
        if (!active) return;
        setApprovedFeed(materials.length ? materials : APPROVED_MATERIALS);
        setCommunityStats(stats);
        setDataStatus("live");
      } catch (error) {
        console.warn("Locker live data unavailable; using local seed data", error);
        if (active) setDataStatus("offline");
      }
    }
    void loadLiveData();
    return () => { active = false; };
  }, [mySchool]);

  const saveUser = (nextUser: LockerUser) => {
    const users = readUsers().filter((u) => u.username !== nextUser.username);
    window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, nextUser]));
    window.localStorage.setItem(SESSION_KEY, nextUser.username);
    setUser(nextUser);
  };

  const handleAuth = (nextUser: LockerUser) => {
    saveUser(nextUser);
    setPseudonym(nextUser.pseudonym);
    setMySchool(nextUser.school);
    setProfileId(nextUser.profileId);
    setOnboarded(Boolean(nextUser.school));
    setTab(nextUser.school ? "browse" : "home");
  };

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setOnboarded(false);
    setPseudonym("");
    setMySchool("");
    setTab("home");
  };

  const handleOnboardComplete = async (p: string, s: string) => {
    let nextUser = user ? { ...user, pseudonym: p, school: s } : null;
    if (nextUser && supabaseConfigured) {
      try {
        const profile = await upsertProfile({ username: nextUser.username, pseudonym: p, school: s });
        nextUser = { ...nextUser, profileId: profile.id, pseudonym: profile.pseudonym, school: profile.school };
        setProfileId(profile.id);
      } catch (error) {
        console.warn("Could not save Locker profile yet", error);
      }
    }
    if (nextUser) saveUser(nextUser);
    setPseudonym(nextUser?.pseudonym ?? p);
    setMySchool(nextUser?.school ?? s);
    setOnboarded(true);
    setFilterSchool("all");
    setTab("browse");
  };

  const searchResults = useMemo(() => {
    return rankMaterials({
      materials: approvedFeed.filter((m) => !blockedSources.includes(m.pseudonym)),
      query: searchQuery,
      school: mySchool || filterSchool,
      course: filterCourse,
      type: filterType,
      mySchool,
    });
  }, [approvedFeed, blockedSources, filterSchool, filterCourse, filterType, searchQuery, mySchool]);

  const hasSearch = searchQuery.trim().length > 0;
  const totalSubmitted = communityStats.submitted + pendingQueue.length;
  const archivePageCount = Math.max(
    totalSubmitted,
    approvedFeed.reduce((sum, material) => sum + (material.pages ?? 1), 0) + pendingQueue.reduce((sum, material) => sum + (material.pages ?? 1), 0)
  );

  return (
    <>
      {authReady && !user && <AuthGate onAuth={handleAuth} />}
      {authReady && user && !onboarded && <OnboardingModal onComplete={handleOnboardComplete} />}

      {viewingMaterial && (
        <DocumentViewer material={viewingMaterial} onClose={() => setViewingMaterial(null)} />
      )}

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden bg-black">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(0,113,227,0.28),transparent_70%)]" />
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/72 px-5 py-4 glass">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            {onboarded && mySchool && (
              <div className="flex items-center gap-2">
                <div className="max-w-[140px] truncate rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
                  {mySchool.replace(" High School", "")}
                </div>
                <button onClick={handleLogout} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-500 transition hover:text-white">
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="relative z-10 flex-1 overflow-y-auto px-5 pt-2 pb-nav">
          {tab === "home" && (
            <LandingView onGetStarted={() => setTab("browse")} onboard={!onboarded ? undefined : () => setTab("browse")} />
          )}

          {tab === "browse" && (
            <div className="space-y-5">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#2997ff]">{mySchool.replace(" High School", "") || "Your school"}</p>
                  <h1 className="mt-2 text-4xl font-semibold leading-[0.95] tracking-[-0.075em] text-white">Search the archive.</h1>
                  <p className="mt-3 text-sm leading-6 text-white/48">Assignments, quizzes, worksheets, and past exams — searchable by class, teacher, unit, year, and text from the page.</p>
                </div>
                <ArchiveGrowthGraphic count={archivePageCount} school={mySchool.replace(" High School", "") || "your school"} />
              </div>
              <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.025] px-3 py-2 text-[11px] text-slate-500">
                <span>{dataStatus === "live" ? "Live database" : dataStatus === "loading" ? "Connecting to database…" : "Offline seed mode"}</span>
                <span className={dataStatus === "live" ? "text-emerald-300" : "text-amber-300"}>{dataStatus === "live" ? "synced" : "local"}</span>
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
                  <Archive size={36} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No material from your school matched that search.</p>
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
                  <p className="text-xs text-white/36">{searchResults.length} {hasSearch ? "matched school materials" : "school materials"}</p>
                  {searchResults.map((r) => (
                    <MaterialCard
                      key={r.material.id}
                      material={r.material}
                      onOpen={setViewingMaterial}
                      matchReason={hasSearch ? r.reason : undefined}
                      matchedTerms={hasSearch ? r.terms : undefined}
                      profileId={profileId}
                      onBlockSource={(source) => {
                        const next = Array.from(new Set([...blockedSources, source]));
                        setBlockedSources(next);
                        window.localStorage.setItem(BLOCKED_SOURCES_KEY, JSON.stringify(next));
                      }}
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
              profileId={profileId}
              onApproved={(m) => { setApprovedFeed((prev) => [m, ...prev]); setCommunityStats((prev) => ({ ...prev, submitted: prev.submitted + 1, approved: prev.approved + 1 })); }}
              onQueued={(m) => { setPendingQueue((prev) => [m, ...prev]); setCommunityStats((prev) => ({ ...prev, submitted: prev.submitted + 1 })); }}
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

function ArchiveGrowthGraphic({ count, school, compact = false }: { count: number; school: string; compact?: boolean }) {
  const [shown, setShown] = useState(0);
  const [pulse, setPulse] = useState(false);
  const lastCount = useRef(count);

  useEffect(() => {
    const start = Math.max(0, count - 38);
    const end = count;
    const started = performance.now();
    const duration = compact ? 900 : 1250;
    let frame = 0;

    if (count > lastCount.current) {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1400);
    }

    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(start + (end - start) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    lastCount.current = count;
    return () => cancelAnimationFrame(frame);
  }, [count, compact]);

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#f5f5f7] p-4 text-[#1d1d1f] shadow-2xl shadow-black/30">
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#0071e3]/20 blur-2xl" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/38">Archive growing</p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-5xl font-semibold leading-none tracking-[-0.085em] text-black tabular-nums">{shown.toLocaleString()}</p>
            <p className="pb-1 text-xs font-medium uppercase tracking-[0.14em] text-black/42">pages</p>
          </div>
          <p className="mt-2 text-sm leading-5 text-black/55">Every scan adds another searchable page to {school}&apos;s archive.</p>
        </div>
        <div className="relative h-28 w-28 shrink-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-2xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.16)]"
              style={{
                inset: `${18 - i * 2}px ${18 + i * 4}px ${8 + i * 4}px ${12 - i}px`,
                transform: `rotate(${(i - 3) * 4}deg) translateY(${i % 2 ? -2 : 2}px)`,
                opacity: 0.42 + i * 0.08,
              }}
            >
              <div className="mx-3 mt-3 h-1.5 rounded-full bg-black/18" />
              <div className="mx-3 mt-2 h-1.5 w-3/5 rounded-full bg-black/10" />
              <div className="mx-3 mt-5 h-8 rounded-xl bg-[#0071e3]/10" />
            </div>
          ))}
          <div className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#0071e3] text-white shadow-[0_10px_28px_rgba(0,113,227,0.45)]">
            <ScanText size={18} />
          </div>
        </div>
      </div>
      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full bg-[#0071e3] transition-all duration-700" style={{ width: `${Math.min(92, 18 + (shown % 100))}%` }} />
      </div>
      {pulse && <div className="absolute right-5 top-5 rounded-full bg-[#0071e3] px-3 py-1 text-xs font-semibold text-white">+1 indexed</div>}
    </div>
  );
}

function readBlockedSources(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BLOCKED_SOURCES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function readUsers(): LockerUser[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function AuthGate({ onAuth }: { onAuth: (user: LockerUser) => void }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (cleanUsername.length < 3) {
      setError("Use at least 3 characters.");
      return;
    }

    const users = readUsers();
    const existing = users.find((u) => u.username === cleanUsername);
    onAuth(existing ?? { username: cleanUsername, pseudonym: cleanUsername, school: "" });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-4 sm:items-center">
      <form onSubmit={submit} className="w-full max-w-sm animate-slide-up rounded-[2rem] border border-white/10 bg-[#111217] p-6 shadow-2xl shadow-black/50">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-white text-black p-3">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">Pick an alias</h2>
            <p className="text-sm text-slate-500">No email. No password. Choose a handle and enter.</p>
          </div>
        </div>

        <label className="relative block">
          <UserRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="alias"
            autoCapitalize="none"
            className="w-full rounded-full border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600"
          />
        </label>

        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

        <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-4 text-sm font-semibold text-black transition active:scale-[0.99]">
          Enter Locker <ArrowRight size={16} />
        </button>
        <p className="mt-4 text-center text-[11px] leading-5 text-slate-600">
          Your alias and school are saved so Locker can connect uploads to a public handle.
        </p>
      </form>
    </div>
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
        tags: [...material.tags, material.grade, material.unit, material.year].filter(Boolean).join(" ").toLowerCase(),
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
        if ((material.teacher ?? "").toLowerCase().includes(token)) { score += 10; hit = true; }
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
  if (hits.length === 0) return "Locker found this from the scanned past material and class details.";
  const readable = hits.slice(0, 3).join(", ");
  return `Matched because the scanned past material mentions ${readable} in ${material.course}.`;
}

function SearchAnswer({ query, results }: { query: string; results: RankedMaterial[] }) {
  const best = results[0];
  if (!best) return null;
  return (
    <div className="rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/[0.055] p-4">
      <div className="mb-3 inline-flex rounded-full bg-cyan-300/10 px-3 py-1 text-[11px] font-medium text-cyan-200">
        Locker database search
      </div>
      <p className="text-sm leading-6 text-slate-300">
        Found <span className="text-white">{results.length}</span> past drop{results.length === 1 ? "" : "s"} for “{query.trim()}”.
        Best match is <span className="text-white">{best.material.title}</span>.
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{best.reason}</p>
    </div>
  );
}

function LandingView({ onGetStarted, onboard }: { onGetStarted: () => void; onboard?: () => void }) {
  return (
    <div className="animate-slide-up pt-6">
      <section className="flex min-h-[78vh] flex-col justify-between">
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-white/[0.045] p-4 blue-glow">
            <div className="archive-grid pointer-events-none absolute inset-0 opacity-70" />
            <div className="relative space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] font-medium text-white/70 glass">
                <Database size={13} className="text-[#2997ff]" /> Your school&apos;s assignment database
              </div>
              <div className="space-y-3">
                <h1 className="text-[3.65rem] font-semibold leading-[0.88] tracking-[-0.09em] text-white">
                  Every class.<br />Every page.<br />Found fast.
                </h1>
                <p className="max-w-[21rem] text-[17px] leading-7 tracking-[-0.02em] text-white/66">
                  Search assignments, quizzes, worksheets, and past exams from your own school — scanned by students, organized for studying.
                </p>
              </div>
              <div className="relative rounded-[1.65rem] border border-white/10 bg-black/55 p-4 shadow-2xl shadow-black/50">
                <div className="mb-3 flex items-center justify-between text-[11px] text-white/45">
                  <span>Locker scan preview</span>
                  <span className="text-[#2997ff]">OCR ready</span>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-[#f5f5f7] p-4 text-[#1d1d1f]">
                  <div className="animate-scan-sweep absolute inset-x-4 top-1/2 h-0.5 bg-[#0071e3] shadow-[0_0_22px_rgba(0,113,227,.85)]" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/35">Grade 11 Chemistry</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.04em]">Bonding Assignment — Unit 3</p>
                  <div className="mt-4 space-y-2 text-xs text-black/55">
                    <p>1. Draw Lewis structures for each molecule.</p>
                    <p>2. Identify molecular shape and polarity.</p>
                    <p>3. Explain intermolecular forces.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ArchiveGrowthGraphic count={1284} school="your school" compact />

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-white/36">How it works</p>
              <span className="rounded-full bg-[#0071e3]/15 px-2.5 py-1 text-[10px] font-semibold text-[#2997ff]">reviewed archive</span>
            </div>
            <div className="space-y-3">
              <FeatureRow icon={<ScanText size={18} />} title="Scan school material" text="Assignments, quizzes, worksheets, past exams, and completed copies." />
              <FeatureRow icon={<ShieldCheck size={18} />} title="Cleaned and moderated" text="Active tests, teacher-only keys, and personal info stay blocked." />
              <FeatureRow icon={<Archive size={18} />} title="Search the archive" text="Find material by class, teacher, grade, unit, year, or OCR text." />
            </div>
          </div>
        </div>

        <div className="space-y-3 pb-6 pt-6">
          <button
            onClick={onboard ?? onGetStarted}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-4 text-[15px] font-semibold tracking-[-0.01em] text-black transition active:scale-[0.99]"
          >
            Search the school archive <ArrowRight size={16} />
          </button>
          <div className="space-y-2 text-center text-xs text-white/35">
            <p>Anonymous uploads · school-only database · reviewed before public</p>
            <p><a className="text-white/45 underline underline-offset-4" href="privacy">Privacy</a> · <a className="text-white/45 underline underline-offset-4" href="terms">Terms</a></p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-[#2997ff]">{icon}</div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs leading-5 text-white/42">{text}</p>
      </div>
    </div>
  );
}
