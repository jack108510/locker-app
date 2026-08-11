"use client";

import { useState, useEffect } from "react";
import { generatePseudonym } from "@/lib/mockData";
import { LockerIcon } from "@/components/Logo";
import { RefreshCw, Eye, EyeOff, ArrowRight, MapPin, Loader2 } from "lucide-react";

interface OnboardingModalProps {
  onComplete: (pseudonym: string, school: string) => void;
}

const SCHOOLS = [
  "Lincoln High School",
  "Riverside High School",
  "Westview High School",
  "Central High School",
  "Other / Type below",
];

const LOCATION_FALLBACK_SCHOOLS = [
  "Halifax West High School",
  "Citadel High School",
  "Auburn Drive High School",
  "Prince Andrew High School",
  "Dartmouth High School",
];

type NearbySchool = {
  name: string;
};

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [pseudonym, setPseudonym] = useState("");
  const [school, setSchool] = useState("");
  const [customSchool, setCustomSchool] = useState("");
  const [showWhat, setShowWhat] = useState(false);
  const [nearbySchools, setNearbySchools] = useState<NearbySchool[]>([]);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    setPseudonym(generatePseudonym());
  }, []);

  const reroll = () => setPseudonym(generatePseudonym());

  const getNearbySchools = async () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationMessage("Location is not available in this browser. Showing examples instead.");
      setNearbySchools(LOCATION_FALLBACK_SCHOOLS.map((name) => ({ name })));
      return;
    }

    setLocationStatus("loading");
    setLocationMessage("Using your location once to look for nearby schools…");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const query = `
            [out:json][timeout:10];
            (
              node["amenity"="school"](around:12000,${latitude},${longitude});
              way["amenity"="school"](around:12000,${latitude},${longitude});
              relation["amenity"="school"](around:12000,${latitude},${longitude});
            );
            out center tags 20;
          `;

          const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: new URLSearchParams({ data: query }),
          });

          if (!response.ok) throw new Error("School lookup failed");

          const data: { elements?: Array<{ tags?: { name?: string } }> } = await response.json();
          const names = Array.from(
            new Set(
              (data.elements || [])
                .map((el) => el.tags?.name)
                .filter((name): name is string => Boolean(name && name.length > 2))
            )
          ).slice(0, 6);

          setNearbySchools((names.length ? names : LOCATION_FALLBACK_SCHOOLS).map((name) => ({ name })));
          setLocationStatus("success");
          setLocationMessage("Location cleared. Pick a school below or type your own.");
        } catch {
          setNearbySchools(LOCATION_FALLBACK_SCHOOLS.map((name) => ({ name })));
          setLocationStatus("error");
          setLocationMessage("Couldn’t reach the school lookup. Showing examples — you can still type your school.");
        }
      },
      () => {
        setNearbySchools(LOCATION_FALLBACK_SCHOOLS.map((name) => ({ name })));
        setLocationStatus("error");
        setLocationMessage("Location wasn’t shared. Showing examples — you can still type your school.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleContinue = () => {
    if (step === 1) { setStep(2); return; }
    const finalSchool = school === "Other / Type below" ? customSchool : school;
    if (!finalSchool) return;
    onComplete(pseudonym, finalSchool);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop bg-black/70">
      <div className="w-full max-w-sm bg-[#12131f] border border-[#2a2b45] rounded-3xl p-6 animate-slide-up shadow-2xl">
        {/* Step 1 — pseudonym */}
        {step === 1 && (
          <>
            <div className="flex justify-center mb-5">
              <LockerIcon size="lg" />
            </div>
            <h2 className="text-2xl font-bold text-center text-white mb-1">Welcome to Locker</h2>
            <p className="text-slate-400 text-center text-sm mb-6">
              Your study stash — always anonymous.
            </p>

            <div className="bg-[#1a1b2e] rounded-2xl p-4 mb-4 border border-[#2a2b45]">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-semibold">Your alias</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-indigo-300">{pseudonym}</span>
                <button
                  onClick={reroll}
                  className="p-2 rounded-xl hover:bg-[#2a2b45] transition-colors text-slate-400 hover:text-white"
                  title="Get a new alias"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowWhat(!showWhat)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors"
            >
              {showWhat ? <EyeOff size={13} /> : <Eye size={13} />}
              {showWhat ? "Hide" : "What do we know about you?"}
            </button>

            {showWhat && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 mb-4 text-sm text-emerald-300 space-y-1">
                <p>✓ Nothing. No account, no email, no name.</p>
                <p>✓ Aliases are random — not linked to your device.</p>
                <p>✓ IP addresses are never stored or logged.</p>
              </div>
            )}

            <button
              onClick={handleContinue}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold transition-all duration-150 flex items-center justify-center gap-2"
            >
              That&apos;s me <ArrowRight size={16} />
            </button>
          </>
        )}

        {/* Step 2 — pick school */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-white mb-1">Pick your school</h2>
            <p className="text-slate-400 text-sm mb-5">
              Used to filter the feed. Not tied to your identity.
            </p>

            <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-cyan-400/10 p-2 text-cyan-300">
                  <MapPin size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-cyan-100">Find schools near me</p>
                  <p className="mt-1 text-xs leading-relaxed text-cyan-100/60">
                    Optional. Your location is used once in this browser to suggest schools, then cleared. Locker does not save it.
                  </p>
                  <button
                    onClick={getNearbySchools}
                    disabled={locationStatus === "loading"}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/15 disabled:opacity-50"
                  >
                    {locationStatus === "loading" ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                    {locationStatus === "loading" ? "Checking nearby…" : "Use my location once"}
                  </button>
                </div>
              </div>
              {locationMessage && (
                <p className={`mt-3 text-xs ${locationStatus === "error" ? "text-amber-300/80" : "text-cyan-100/60"}`}>
                  {locationMessage}
                </p>
              )}
            </div>

            {nearbySchools.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Nearby suggestions</p>
                <div className="space-y-2">
                  {nearbySchools.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => setSchool(s.name)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                        school === s.name
                          ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                          : "border-[#2a2b45] bg-[#1a1b2e] text-slate-300 hover:border-cyan-400/40"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2 mb-4">
              {SCHOOLS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSchool(s)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                    school === s
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                      : "border-[#2a2b45] bg-[#1a1b2e] text-slate-300 hover:border-indigo-500/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {school === "Other / Type below" && (
              <input
                className="w-full px-4 py-3 rounded-xl bg-[#1a1b2e] border border-[#2a2b45] text-white placeholder-slate-500 text-sm mb-4 focus:border-indigo-500 transition-colors"
                placeholder="Type your school name…"
                value={customSchool}
                onChange={(e) => setCustomSchool(e.target.value)}
              />
            )}
            <button
              onClick={handleContinue}
              disabled={!school || (school === "Other / Type below" && !customSchool)}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center justify-center gap-2"
            >
              Enter Locker <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
