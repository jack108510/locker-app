"use client";

import { useEffect, useRef, useState } from "react";
import { SCHOOLS, MATERIAL_TYPES, moderateUpload, MaterialType, StudyMaterial } from "@/lib/mockData";
import { submitMaterial, uploadMaterialImage } from "@/lib/lockerData";
import { supabaseConfigured } from "@/lib/supabase";
import { Upload, CheckCircle, AlertCircle, XCircle, X, ScanText, Loader2, Camera, Sparkles } from "lucide-react";
import { clsx } from "clsx";

interface UploadFormProps {
  pseudonym: string;
  currentSchool?: string;
  profileId?: string;
  onApproved: (m: StudyMaterial) => void;
  onQueued: (m: StudyMaterial) => void;
}

type SubmitState = "idle" | "reviewing" | "approved" | "pending" | "blocked";

export function UploadForm({ pseudonym, currentSchool, profileId, onApproved, onQueued }: UploadFormProps) {
  const [type, setType] = useState<MaterialType | "">("");
  const [school, setSchool] = useState(currentSchool ?? "");
  const [course, setCourse] = useState("");
  const [teacher, setTeacher] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [scannedText, setScannedText] = useState("");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "done" | "unsupported" | "error">("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [state, setState] = useState<SubmitState>("idle");
  const [moderationResult, setModerationResult] = useState<{ status: string; reason?: string } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturing, setCapturing] = useState(false);

  const schoolOptions = currentSchool && !SCHOOLS.some((s) => s.name === currentSchool)
    ? [{ id: "current-school", name: currentSchool, courses: [] }, ...SCHOOLS]
    : SCHOOLS;

  const selectedSchool = schoolOptions.find((s) => s.name === school);
  const courses = selectedSchool?.courses ?? [];
  const canSubmit = type && school && title && file && scanState !== "scanning";

  const stopScanner = () => {
    document.body.classList.remove("locker-scanning");
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScannerOpen(false);
    setCameraReady(false);
    setCameraError("");
    setCapturing(false);
  };

  useEffect(() => () => stopScanner(), []);

  const startScanner = async () => {
    setScannerOpen(true);
    document.body.classList.add("locker-scanning");
    setCameraError("");
    setCameraReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera scanning is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1800 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraError("Camera permission was blocked. Use photo upload instead.");
    }
  };

  const captureLivePage = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;

    setCapturing(true);
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 1800;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      return;
    }

    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCapturing(false);
        return;
      }
      const liveFile = new File([blob], `locker-scan-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(liveFile);
      stopScanner();
      void scanFile(liveFile).finally(() => setCapturing(false));
    }, "image/jpeg", 0.92);
  };

  const scanFile = async (selectedFile: File) => {
    setScannedText("");
    setScanProgress(0);

    if (!selectedFile.type.startsWith("image/")) {
      setScanState("unsupported");
      return;
    }

    setScanState("scanning");
    try {
      const { recognize } = await import("tesseract.js");
      const result = await recognize(selectedFile, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setScanProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text.trim();
      setScannedText(text);
      setScanState(text ? "done" : "error");
      setScanProgress(100);
    } catch {
      setScanState("error");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      void scanFile(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setState("reviewing");
    await new Promise((r) => setTimeout(r, 1200));

    const result = moderateUpload(title, type as MaterialType, scannedText);
    setModerationResult(result);

    const localMaterial: StudyMaterial = {
      id: `u-${Date.now()}`,
      title,
      type: type as MaterialType,
      school,
      course: course || "General",
      teacher: teacher || undefined,
      pseudonym,
      uploadedAt: new Date().toISOString().split("T")[0],
      upvotes: 0,
      saves: 0,
      status: result.status,
      tags: [course, teacher, type as string].filter(Boolean),
      preview: scannedText
        ? scannedText.slice(0, 220)
        : "Submitted past material — pending or approved after moderation review.",
      ocrText: scannedText || undefined,
      pages: 1,
    };

    let newMaterial = localMaterial;
    if (supabaseConfigured) {
      try {
        const imageUrl = file ? await uploadMaterialImage(file, school) : undefined;
        newMaterial = await submitMaterial({
          profileId,
          title,
          type: type as MaterialType,
          school,
          course: course || "General",
          teacher: teacher || undefined,
          pseudonym,
          status: result.status,
          moderationReason: result.reason,
          tags: localMaterial.tags,
          scannedText,
          preview: localMaterial.preview,
          pages: 1,
          imageUrl,
        });
        setSubmitError("");
      } catch (error) {
        console.warn("Live database submit failed", error);
        setSubmitError("Couldn’t reach the live database. Saved locally for this session.");
      }
    }

    if (result.status === "approved") {
      setState("approved");
      onApproved(newMaterial);
    } else if (result.status === "pending") {
      setState("pending");
      onQueued(newMaterial);
    } else {
      setState("blocked");
    }
  };

  const reset = () => {
    setType(""); setSchool(""); setCourse(""); setTeacher("");
    setTitle(""); setFile(null); setScannedText(""); setScanState("idle"); setScanProgress(0); setState("idle"); setModerationResult(null); setSubmitError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  if (state === "reviewing") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 animate-slide-up">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Checking the drop before it goes public…</p>
      </div>
    );
  }

  if (state === "approved") {
    return (
      <div className="flex flex-col items-center text-center py-12 gap-4 animate-slide-up px-4">
        <CheckCircle size={52} className="text-emerald-400" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-white">Added to the public database</h3>
        <p className="text-slate-400 text-sm max-w-xs">{submitError || `Your past material passed review and is searchable by students from ${school}.`}</p>
        <button onClick={reset} className="mt-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all">
          Scan another
        </button>
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className="flex flex-col items-center text-center py-12 gap-4 animate-slide-up px-4">
        <AlertCircle size={52} className="text-amber-400" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-white">In the queue</h3>
        <p className="text-slate-400 text-sm max-w-xs">
          {submitError || moderationResult?.reason || "Your scan is under review. It goes into the shared database once a moderator clears it — usually under 24 hours."}
        </p>
        <button onClick={reset} className="mt-2 px-6 py-3 rounded-2xl bg-[#1a1b2e] border border-[#2a2b45] hover:border-indigo-500/40 text-white font-semibold text-sm transition-all">
          Scan another
        </button>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="flex flex-col items-center text-center py-12 gap-4 animate-slide-up px-4">
        <XCircle size={52} className="text-red-400" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-white">Drop blocked</h3>
        <p className="text-slate-400 text-sm max-w-xs">{moderationResult?.reason}</p>
        <div className="bg-[#1a1b2e] border border-red-500/20 rounded-xl p-4 text-left max-w-xs w-full mt-2">
          <p className="text-xs text-red-400 font-semibold mb-1">Not allowed on Locker:</p>
          <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li>Current / still-active test material</li>
            <li>Answer keys or teacher editions</li>
            <li>Student names, grades, or personal info</li>
            <li>Teacher-only copies or answer keys</li>
            <li>Photos containing personal student info</li>
          </ul>
        </div>
        <button onClick={reset} className="mt-2 px-6 py-3 rounded-2xl bg-[#1a1b2e] border border-[#2a2b45] hover:border-indigo-500/40 text-white font-semibold text-sm transition-all">
          Try again with old material
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white mb-1">Scan old material</h2>
        <p className="text-sm text-slate-500">Scan old material from your school. Include the answers if they are on the page.</p>
      </div>

      <button
        type="button"
        onClick={startScanner}
        className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.06] p-5 text-left transition active:scale-[0.99]"
      >
        <div className="absolute inset-x-6 top-1/2 h-px bg-cyan-200/50 shadow-[0_0_28px_rgba(103,232,249,0.9)]" />
        <div className="relative flex items-center justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-cyan-300/10 px-3 py-1 text-[11px] font-medium text-cyan-200">
              public database drop
            </div>
            <p className="text-lg font-medium text-white">Scan assignment / quiz / exam with answers</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">Capture a page, pull text, add it to your school&apos;s database.</p>
          </div>
          <div className="rounded-full bg-white text-black p-4">
            <Camera size={20} />
          </div>
        </div>
      </button>

      {scannerOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/95 p-5">
          <div className="mx-auto flex h-full max-w-md flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Hold page inside frame</p>
              <p className="text-xs text-slate-500">Capture when the old page is sharp.</p>
            </div>
            <button type="button" onClick={stopScanner} className="rounded-full bg-white/10 p-2 text-white">
              <X size={18} />
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-[#08090d]">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-6 rounded-[1.5rem] border border-cyan-200/70 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
            <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-cyan-200 shadow-[0_0_24px_rgba(103,232,249,0.95)] animate-pulse" />
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur">
              <div className="flex items-center gap-2 text-xs text-cyan-100">
                <Sparkles size={14} /> Detecting questions + printed text
              </div>
            </div>
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <div className="rounded-3xl border border-white/10 bg-black/70 p-5">
                  <p className="text-sm text-white">{cameraError}</p>
                  <button type="button" onClick={() => fileRef.current?.click()} className="mt-4 rounded-full bg-white px-5 py-3 text-sm font-medium text-black">
                    Pick photo
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={captureLivePage}
            disabled={!cameraReady || capturing}
            className="mt-5 rounded-full bg-white py-4 text-sm font-semibold text-black disabled:opacity-40"
          >
            {capturing ? "Capturing…" : "Capture page"}
          </button>
          </div>
        </div>
      )}

      {/* Photo */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">Old material</label>
        <div
          onClick={() => fileRef.current?.click()}
          className={clsx(
            "rounded-[1.75rem] border border-dashed p-7 text-center cursor-pointer transition-all",
            file
              ? "border-white/20 bg-white/[0.04]"
              : "border-white/10 bg-white/[0.025]"
          )}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <ScanText size={20} className="text-cyan-300" />
              <div className="text-left">
                <p className="text-sm text-white font-medium">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setScannedText("");
                  setScanState("idle");
                  setScanProgress(0);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="ml-2 text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={22} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Or pick a photo of old material</p>
              <p className="text-xs text-slate-600 mt-1">Assignments, quizzes, exams, answers</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={handleFile} className="hidden" />

        {file && (
          <div className="mt-3 rounded-2xl border border-[#2a2b45] bg-[#101522] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {scanState === "scanning" ? <Loader2 size={16} className="animate-spin text-cyan-300" /> : <ScanText size={16} className="text-cyan-300" />}
                <span className="text-sm font-semibold text-white">Database scanner</span>
              </div>
              <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-200">
                OCR
              </span>
            </div>

            {scanState === "scanning" && (
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1a1b2e]">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all" style={{ width: `${Math.max(scanProgress, 8)}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">Pulling text off the page… {scanProgress}%</p>
              </div>
            )}

            {scanState === "done" && (
              <div>
                <p className="mb-2 text-xs text-emerald-300">Text pulled from the page. Locker uses it for search + moderation before making it public.</p>
                <textarea
                  value={scannedText}
                  onChange={(e) => setScannedText(e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-[#2a2b45] bg-[#0b0d16] px-3 py-2 text-xs leading-relaxed text-slate-300 outline-none focus:border-cyan-400/50"
                />
              </div>
            )}

            {scanState === "unsupported" && (
              <p className="text-xs leading-relaxed text-amber-300/80">
                Locker only takes photos of old school material from the camera or photo library.
              </p>
            )}

            {scanState === "error" && (
              <p className="text-xs leading-relaxed text-red-300/80">
                Couldn’t read text from this image. You can still submit the old material for review.
              </p>
            )}
          </div>
        )}
      </div>

      {file ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-200">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300/10 text-[11px]">2</span>
            Label the drop
          </div>

      {/* Type */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">Type</label>
        <div className="-mx-5 overflow-x-auto px-5 no-scrollbar">
          <div className="flex gap-2 whitespace-nowrap">
          {MATERIAL_TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setType(t.value)}
              className={clsx(
                "flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium transition-all",
                type === t.value
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/[0.03] text-slate-400"
              )}
            >
              <span className="text-base">{t.emoji}</span>
              <span className="text-xs leading-tight">{t.label}</span>
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* School */}
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs text-slate-600">School</p>
        <p className="mt-1 text-sm font-medium text-white">{school || currentSchool || "Nearby school"}</p>
      </div>

      {/* Course */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          Class <span className="font-normal text-slate-600">optional</span>
        </label>
        <select
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          disabled={!school}
          className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none appearance-none disabled:opacity-40"
        >
          <option value="">Select course…</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Teacher */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">Teacher <span className="font-normal text-slate-600">optional</span></label>
        <input
          type="text"
          placeholder="e.g. Ms. Clarke"
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">Title</label>
        <input
          type="text"
          placeholder="e.g. AP Chem Unit 4 Quiz 2022"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
        />
      </div>

      {type === "assignment" && (
        <div className="flex flex-wrap gap-1.5">
          {course && <span className="rounded-full bg-cyan-300/10 px-3 py-1.5 text-[11px] font-medium text-cyan-100">Class: {course}</span>}
          {teacher && <span className="rounded-full bg-indigo-300/10 px-3 py-1.5 text-[11px] font-medium text-indigo-100">Teacher: {teacher}</span>}
        </div>
      )}


      {/* Review notice */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-xs leading-5 text-slate-500">
        Public to your school after review. Old assignments/quizzes/exams with answers are allowed; current tests, teacher-only keys, and personal info stay blocked.
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 flex items-center justify-center gap-2"
      >
        <Upload size={16} /> Add to public database
      </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-500">
          Scan a page or pick a photo first. Manual details unlock after Locker has the image.
        </div>
      )}
    </form>
  );
}
