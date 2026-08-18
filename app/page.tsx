"use client";

import { useState, useMemo, useEffect } from "react";
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

  return (
    <>
      {authReady && !user && <AuthGate onAuth={handleAuth} />}
      {authReady && user && !onboarded && <OnboardingModal onComplete={handleOnboardComplete} />}

      {viewingMaterial && (
        <DocumentViewer material={viewingMaterial} onClose={() => setViewingMaterial(null)} />
      )}

      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[#08090d]">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-[#08090d]/85 glass px-5 py-4">
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
        <main className="flex-1 px-5 pt-2 pb-nav overflow-y-auto">
          {tab === "home" && (
            <LandingView onGetStarted={() => setTab("browse")} onboard={!onboarded ? undefined : () => setTab("browse")} />
          )}

          {tab === "browse" && (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">Your feed</h1>
                  <p className="text-sm text-slate-500">Only material from {mySchool.replace(" High School", "") || "your school"}.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat value={totalSubmitted.toLocaleString()} label="submitted" />
                  <MiniStat value={communityStats.approved.toLocaleString()} label="approved" />
                  <MiniStat value={communityStats.schools.toString()} label="schools" />
                </div>
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
                  <p className="text-xs text-slate-600">{searchResults.length} {hasSearch ? "matched school drops" : "school drops"}</p>
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

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3">
      <p className="text-lg font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">{label}</p>
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
          Your alias and school are saved so Locker can connect drops to a public handle.
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
    <div className="animate-slide-up pt-8">
      <section className="min-h-[72vh] flex flex-col justify-between">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1 text-xs text-cyan-100">
            <Database size={13} /> Your school test bank
          </div>

          <div className="space-y-4">
            <h1 className="text-[3.25rem] font-semibold tracking-[-0.08em] leading-[0.92] text-white">
              Old tests.<br />New edge.
            </h1>
            <p className="max-w-[20rem] text-base leading-7 text-slate-400">
              Locker is a database for your school: old assignments, quizzes, exams, and answer-filled copies scanned by students there.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-600">How it works</p>
              <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">public after review</span>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <ScanText className="mt-0.5 text-cyan-300" size={18} />
                <div>
                  <p className="text-sm font-medium text-white">Scan past material</p>
                  <p className="text-xs leading-5 text-slate-500">Old assignments, quizzes, exams, and versions with answers.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 text-indigo-300" size={18} />
                <div>
                  <p className="text-sm font-medium text-white">Moderated into the database</p>
                  <p className="text-xs leading-5 text-slate-500">Current tests, teacher-only keys, and personal info get blocked.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Archive className="mt-0.5 text-fuchsia-300" size={18} />
                <div>
                  <p className="text-sm font-medium text-white">Anyone signed up can search it</p>
                  <p className="text-xs leading-5 text-slate-500">Find real past questions and answers by topic, class, or teacher.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pb-6">
          <button
            onClick={onboard ?? onGetStarted}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-4 text-sm font-semibold text-black transition active:scale-[0.99]"
          >
            Search the test bank <ArrowRight size={16} />
          </button>
          <div className="space-y-2 text-center text-xs text-slate-600">
            <p>Anonymous drops · only your school · reviewed before public</p>
            <p><a className="text-slate-500 underline underline-offset-4" href="privacy">Privacy</a> · <a className="text-slate-500 underline underline-offset-4" href="terms">Terms</a></p>
          </div>
        </div>
      </section>
    </div>
  );
}
