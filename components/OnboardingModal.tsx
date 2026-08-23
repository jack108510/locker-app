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
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-4 modal-backdrop sm:items-center">
      <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-[2rem] border border-white/10 bg-[#111217] p-6 shadow-2xl shadow-black/50 animate-slide-up">
        {step === 1 && (
          <>
            <div className="flex justify-center mb-5">
              <LockerIcon size="lg" />
            </div>
            <h2 className="mb-1 text-center text-2xl font-semibold tracking-[-0.045em] text-white">Set up your locker</h2>
            <p className="mb-6 text-center text-sm leading-6 text-slate-400">
              Join the study archive for your school without using your real name.
            </p>

            <div className="mb-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Public alias</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold tracking-[-0.03em] text-white">{pseudonym}</span>
                <button
                  onClick={reroll}
                  className="rounded-full bg-white/[0.05] p-2 text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                  title="Get a new alias"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowWhat(!showWhat)}
              className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
            >
              {showWhat ? <EyeOff size={13} /> : <Eye size={13} />}
              {showWhat ? "Hide" : "What do we know about you?"}
            </button>

            {showWhat && (
              <div className="mb-4 space-y-1 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3 text-sm text-emerald-200">
                <p>✓ No real name is required.</p>
                <p>✓ Uploads show under this alias.</p>
                <p>✓ Your school controls which study archive you enter.</p>
              </div>
            )}

            <button
              onClick={handleContinue}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 font-semibold text-black transition-all duration-150 active:scale-[0.99]"
            >
              Continue anonymously <ArrowRight size={16} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="mb-1 text-xl font-semibold tracking-[-0.035em] text-white">Pick your school</h2>
            <p className="mb-5 text-sm leading-6 text-slate-400">
              This keeps each archive relevant, searchable, and easier to moderate.
            </p>

            <div className="mb-4 rounded-[1.5rem] border border-[#2997ff]/20 bg-[#2997ff]/[0.06] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-[#2997ff]/10 p-2 text-[#8cc7ff]">
                  {locationStatus === "loading" ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-cyan-50">
                    {locationStatus === "loading" ? "Finding nearby schools…" : "Location-based school list"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-cyan-50/60">
                    Location is used only in this browser for school suggestions. It is not saved to your account, upload, or profile.
                  </p>
                  {locationStatus !== "loading" && (
                    <button
                      onClick={getNearbySchools}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#2997ff]/10 px-3 py-2 text-xs font-semibold text-[#8cc7ff] transition-colors hover:bg-[#2997ff]/15"
                    >
                      <MapPin size={13} /> Refresh nearby schools
                    </button>
                  )}
                </div>
              </div>
              {locationMessage && (
                <p className={`mt-3 text-xs ${locationStatus === "error" ? "text-amber-300/80" : "text-cyan-50/60"}`}>
                  {locationMessage}
                </p>
              )}
            </div>

            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Nearby suggestions</p>
              {nearbySchools.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center text-sm text-slate-500">
                  Waiting for location permission…
                </div>
              ) : (
                <div className="max-h-40 space-y-2 overflow-y-auto pb-2 pr-1">
                  {nearbySchools.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => setSchool(s.name)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                        school === s.name
                          ? "border-[#2997ff] bg-[#2997ff]/10 text-[#b9ddff]"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-[#2997ff]/40"
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 font-semibold text-black shadow-lg shadow-black/30 transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enter study archive <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
