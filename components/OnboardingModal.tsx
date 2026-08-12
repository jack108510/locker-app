"use client";

import { useState, useCallback } from "react";
import { generatePseudonym } from "@/lib/mockData";
import { LockerIcon } from "@/components/Logo";
import { RefreshCw, Eye, EyeOff, ArrowRight, MapPin, Loader2 } from "lucide-react";

interface OnboardingModalProps {
  onComplete: (pseudonym: string, school: string) => void;
}

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
  const [pseudonym, setPseudonym] = useState("BlueFox42");
  const [school, setSchool] = useState("");
  const [showWhat, setShowWhat] = useState(false);
  const [nearbySchools, setNearbySchools] = useState<NearbySchool[]>([]);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState("");

  const reroll = () => setPseudonym(generatePseudonym());

  const setFallbackSchools = (message: string) => {
    setNearbySchools(LOCATION_FALLBACK_SCHOOLS.map((name) => ({ name })));
    setLocationStatus("error");
    setLocationMessage(message);
  };

  const getNearbySchools = useCallback(async () => {
    if (!navigator.geolocation) {
      setFallbackSchools("Location is not available in this browser. Showing nearby examples instead.");
      return;
    }

    setLocationStatus("loading");
    setLocationMessage("Checking your area for nearby schools…");

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
          setLocationMessage("Location cleared. Pick the school closest to you.");
        } catch {
          setFallbackSchools("School lookup timed out. Showing nearby examples instead.");
        }
      },
      () => {
        setFallbackSchools("Location wasn’t shared. Showing nearby examples instead.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  }, []);


  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
      void getNearbySchools();
      return;
    }
    if (!school) return;
    onComplete(pseudonym, school);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop bg-black/70 overflow-y-auto">
      <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto bg-[#12131f] border border-[#2a2b45] rounded-3xl p-6 animate-slide-up shadow-2xl">
        {step === 1 && (
          <>
            <div className="flex justify-center mb-5">
              <LockerIcon size="lg" />
            </div>
            <h2 className="text-2xl font-bold text-center text-white mb-1">Welcome to Locker</h2>
            <p className="text-slate-400 text-center text-sm mb-6">
              A shared database of old assignments, quizzes, and exams.
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
                <p>✓ No real name required in the prototype.</p>
                <p>✓ Your drops show under an alias.</p>
                <p>✓ Your school chooses which public test bank you enter.</p>
              </div>
            )}

            <button
              onClick={handleContinue}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold transition-all duration-150 flex items-center justify-center gap-2"
            >
              Enter anonymously <ArrowRight size={16} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-white mb-1">Schools near you</h2>
            <p className="text-slate-400 text-sm mb-5">
              Pick your school to search the shared database and add old material.
            </p>

            <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-cyan-400/10 p-2 text-cyan-300">
                  {locationStatus === "loading" ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-cyan-100">
                    {locationStatus === "loading" ? "Finding nearby schools…" : "Location-based school list"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-cyan-100/60">
                    Location is used only in this browser for school suggestions. It is not saved to your account, upload, or profile.
                  </p>
                  {locationStatus !== "loading" && (
                    <button
                      onClick={getNearbySchools}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/15"
                    >
                      <MapPin size={13} /> Refresh nearby schools
                    </button>
                  )}
                </div>
              </div>
              {locationMessage && (
                <p className={`mt-3 text-xs ${locationStatus === "error" ? "text-amber-300/80" : "text-cyan-100/60"}`}>
                  {locationMessage}
                </p>
              )}
            </div>

            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Nearby suggestions</p>
              {nearbySchools.length === 0 ? (
                <div className="rounded-xl border border-[#2a2b45] bg-[#1a1b2e] px-4 py-6 text-center text-sm text-slate-500">
                  Waiting for location permission…
                </div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1 pb-2">
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
              )}
            </div>

            <button
              onClick={handleContinue}
              disabled={!school}
              className="mt-3 w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/30"
            >
              Enter test bank <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
