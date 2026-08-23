"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SCHOOLS, MATERIAL_TYPES, moderateUpload, MaterialType, StudyMaterial } from "@/lib/mockData";
import { submitMaterial, uploadMaterialImages } from "@/lib/lockerData";
import { reviewOcrWithBackend, extractTextWithVision } from "@/lib/ocrPipelineClient";
import { supabaseConfigured } from "@/lib/supabase";
import { Upload, CheckCircle, AlertCircle, XCircle, X, ScanText, Loader2, Camera, Sparkles, Wand2 } from "lucide-react";
import { clsx } from "clsx";

interface UploadFormProps {
  pseudonym: string;
  currentSchool?: string;
  profileId?: string;
  onApproved: (m: StudyMaterial) => void;
  onQueued: (m: StudyMaterial) => void;
}

type SubmitState = "idle" | "reviewing" | "approved" | "pending" | "blocked";
type PageScanState = "scanning" | "checking" | "enhancing" | "done" | "unsupported" | "error";

type ScanPage = {
  id: string;
  file: File;
  text: string;
  progress: number;
  state: PageScanState;
  quality?: string;
  ocrSource?: "tesseract" | "ai_review" | "vision_model" | "local_quality_gate";
  reviewReason?: string;
  confidence?: number;
};

type InferredFields = {
  title?: string;
  type?: MaterialType;
  course?: string;
  teacher?: string;
  grade?: string;
  unit?: string;
  year?: string;
};

export function UploadForm({ pseudonym, currentSchool, profileId, onApproved, onQueued }: UploadFormProps) {
  const [type, setType] = useState<MaterialType | "">("");
  const [school, setSchool] = useState(currentSchool ?? "");
  const [course, setCourse] = useState("");
  const [teacher, setTeacher] = useState("");
  const [grade, setGrade] = useState("");
  const [unit, setUnit] = useState("");
  const [year, setYear] = useState("");
  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [state, setState] = useState<SubmitState>("idle");
  const [moderationResult, setModerationResult] = useState<{ status: string; reason?: string } | null>(null);
  const [submitError, setSubmitError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qualityCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [suggestions, setSuggestions] = useState<InferredFields>({});

  const scannedText = useMemo(() => {
    return pages
      .map((page, index) => page.text.trim() ? `Page ${index + 1}\n${page.text.trim()}` : "")
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }, [pages]);

  const scanState = pages.some((p) => p.state === "scanning" || p.state === "checking" || p.state === "enhancing")
    ? "scanning"
    : pages.length === 0
      ? "idle"
      : pages.some((p) => p.state === "done")
        ? "done"
        : pages.some((p) => p.state === "unsupported")
          ? "unsupported"
          : "error";

  const schoolOptions = currentSchool && !SCHOOLS.some((s) => s.name === currentSchool)
    ? [{ id: "current-school", name: currentSchool, courses: [] }, ...SCHOOLS]
    : SCHOOLS;

  const selectedSchool = schoolOptions.find((s) => s.name === school);
  const courses = selectedSchool?.courses ?? [];
  const canSubmit = type && school && title && pages.length > 0 && scanState !== "scanning";

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
      const liveFile = new File([blob], `locker-page-${pages.length + 1}-${Date.now()}.jpg`, { type: "image/jpeg" });
      void addPage(liveFile).finally(() => setCapturing(false));
    }, "image/jpeg", 0.92);
  };

  const addPage = async (selectedFile: File) => {
    const id = crypto.randomUUID();
    const initialState: PageScanState = selectedFile.type.startsWith("image/") ? "scanning" : "unsupported";
    setPages((prev) => [...prev, { id, file: selectedFile, text: "", progress: 0, state: initialState }]);

    if (!selectedFile.type.startsWith("image/")) return;

    const quality = await estimateImageQuality(selectedFile, qualityCanvasRef.current).catch(() => undefined);
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, quality } : p));

    try {
      const { recognize } = await import("tesseract.js");
      const result = await recognize(selectedFile, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            const progress = Math.round(m.progress * 100);
            setPages((prev) => prev.map((p) => p.id === id ? { ...p, progress } : p));
          }
        },
      });

      const rawText = cleanOcrText(result.data.text);
      const confidence = Math.round(result.data.confidence || 0);
      setPages((prev) => prev.map((p) => p.id === id ? { ...p, text: rawText, state: "checking", progress: 100, confidence, quality: `OCR ${confidence}% · checking text` } : p));

      const review = await reviewOcrWithBackend({ rawText, confidence, fileName: selectedFile.name });
      const initialQualityLabel = review.usable ? `OCR accepted · ${review.source === "ai_review" ? "AI checked" : "local checked"}` : "OCR weak · trying vision extraction";
      let visionResult: Awaited<ReturnType<typeof extractTextWithVision>> | null = null;

      if (review.needsVision) {
        setPages((prev) => prev.map((p) => p.id === id ? { ...p, state: "enhancing", quality: initialQualityLabel, reviewReason: review.reason } : p));
        visionResult = await extractTextWithVision({ file: selectedFile, rawText, confidence });
      }

      const visionSucceeded = Boolean(visionResult?.ok && visionResult.text.trim());
      const text = visionSucceeded ? cleanOcrText(visionResult?.text || "") : review.cleanedText;
      const ocrSource: ScanPage["ocrSource"] = visionSucceeded ? "vision_model" : review.source;
      const reviewReason = visionSucceeded ? (visionResult?.reason || "Vision model rescued the scan.") : review.reason;
      const qualityLabel = visionSucceeded
        ? "Vision extracted text"
        : review.needsVision
          ? `Needs better photo · ${visionResult?.reason || review.reason}`
          : initialQualityLabel;

      setPages((prev) => prev.map((p) => p.id === id ? { ...p, text, state: text ? "done" : "error", progress: 100, quality: qualityLabel, ocrSource, reviewReason, confidence } : p));
      const combined = [...pages.map((p) => p.text), text].filter(Boolean).join("\n\n");
      applySuggestions(inferFields(`${selectedFile.name}\n${combined}`, courses));
    } catch {
      setPages((prev) => prev.map((p) => p.id === id ? { ...p, state: "error", progress: 100 } : p));
    }
  };

  const applySuggestions = (next: InferredFields) => {
    if (Object.keys(next).length === 0) return;
    setSuggestions((prev) => ({ ...prev, ...next }));
    if (next.type) setType((existing) => existing || next.type || "");
    if (next.course) setCourse((existing) => existing || next.course || "");
    if (next.teacher) setTeacher((existing) => existing || next.teacher || "");
    if (next.grade) setGrade((existing) => existing || next.grade || "");
    if (next.unit) setUnit((existing) => existing || next.unit || "");
    if (next.year) setYear((existing) => existing || next.year || "");
    if (next.title) setTitle((existing) => existing || next.title || "");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    selected.forEach((f) => void addPage(f));
    if (fileRef.current) fileRef.current.value = "";
  };

  const updatePageText = (id: string, text: string) => {
    setPages((prev) => prev.map((p) => p.id === id ? { ...p, text: cleanOcrText(text), state: text.trim() ? "done" : p.state } : p));
  };

  const removePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setState("reviewing");
    await new Promise((r) => setTimeout(r, 900));

    const result = moderateUpload(title, type as MaterialType, scannedText);
    setModerationResult(result);

    const tags = [course, teacher, grade, unit, year, type as string]
      .filter(Boolean)
      .flatMap((v) => String(v).split(/[,/]/).map((part) => part.trim()).filter(Boolean));

    const localMaterial: StudyMaterial = {
      id: `u-${Date.now()}`,
      title,
      type: type as MaterialType,
      school,
      course: course || "General",
      teacher: teacher || undefined,
      grade: grade || undefined,
      unit: unit || undefined,
      year: year || undefined,
      pseudonym,
      uploadedAt: new Date().toISOString().split("T")[0],
      upvotes: 0,
      saves: 0,
      status: result.status,
      tags,
      preview: buildPreview(scannedText),
      ocrText: scannedText || undefined,
      pages: pages.length,
    };

    let newMaterial = localMaterial;
    if (supabaseConfigured) {
      try {
        const imageUrls = await uploadMaterialImages(pages.map((p) => p.file), school);
        newMaterial = await submitMaterial({
          profileId,
          title,
          type: type as MaterialType,
          school,
          course: course || "General",
          teacher: teacher || undefined,
          grade: grade || undefined,
          unit: unit || undefined,
          year: year || undefined,
          pseudonym,
          status: result.status,
          moderationReason: result.reason,
          tags,
          scannedText,
          preview: localMaterial.preview,
          pages: pages.length,
          imageUrl: imageUrls[0],
          imageUrls,
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
    setType(""); setSchool(currentSchool ?? ""); setCourse(""); setTeacher(""); setGrade(""); setUnit(""); setYear("");
    setTitle(""); setPages([]); setState("idle"); setModerationResult(null); setSubmitError(""); setSuggestions({});
    if (fileRef.current) fileRef.current.value = "";
  };

  if (state === "reviewing") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 animate-slide-up">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#2997ff]/20 bg-[#2997ff]/10">
          <div className="h-10 w-10 rounded-full border-4 border-[#2997ff] border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white">Reviewing before it goes public</p>
          <p className="mt-1 text-xs text-slate-500">Checking active-test, private-key, and personal-info rules…</p>
        </div>
      </div>
    );
  }

  if (state === "approved") {
    return (
      <div className="flex flex-col items-center text-center py-12 gap-4 animate-slide-up px-4">
        <CheckCircle size={52} className="text-emerald-400" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-white">Added to the school archive</h3>
        <p className="text-slate-400 text-sm max-w-xs">{submitError || `Your material is searchable by students from ${school}.`}</p>
        <button onClick={reset} className="mt-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all active:scale-[0.99]">
          Scan another
        </button>
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className="flex flex-col items-center text-center py-12 gap-4 animate-slide-up px-4">
        <AlertCircle size={52} className="text-amber-400" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-white">In the review queue</h3>
        <p className="text-slate-400 text-sm max-w-xs">
          {submitError || moderationResult?.reason || "Your scan is under review. It goes into the school archive once a moderator clears it."}
        </p>
        <button onClick={reset} className="mt-2 rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition-all hover:border-[#2997ff]/40">
          Scan another
        </button>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="flex flex-col items-center text-center py-12 gap-4 animate-slide-up px-4">
        <XCircle size={52} className="text-red-400" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-white">Material blocked</h3>
        <p className="text-slate-400 text-sm max-w-xs">{moderationResult?.reason}</p>
        <div className="bg-[#1a1b2e] border border-red-500/20 rounded-xl p-4 text-left max-w-xs w-full mt-2">
          <p className="text-xs text-red-400 font-semibold mb-1">Not allowed on Locker:</p>
          <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li>Current / still-active test material</li>
            <li>Official teacher-only answer keys</li>
            <li>Student names, grades, or personal info</li>
            <li>Teacher-only copies</li>
            <li>Photos containing personal student info</li>
          </ul>
        </div>
        <button onClick={reset} className="mt-2 rounded-full border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white transition-all hover:border-[#2997ff]/40">
          Try again with old material
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
        <div className="mb-4 inline-flex rounded-full border border-[#2997ff]/20 bg-[#2997ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8cc7ff]">contribute</div>
        <h2 className="text-3xl font-semibold leading-none tracking-[-0.065em] text-white">Add a page to the archive.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">Scan old assignments, quizzes, worksheets, or past exams. Locker extracts text, suggests labels, then reviews before public.</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-white/42">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-2 py-2">photo</div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-2 py-2">OCR</div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-2 py-2">review</div>
        </div>
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
              school archive scan
            </div>
            <p className="text-lg font-medium text-white">Scan one or more pages</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">Capture assignments, quizzes, worksheets, or past exams. Locker pulls searchable text.</p>
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
                <p className="text-xs text-slate-500">Capture each page. Tap Done when finished.</p>
              </div>
              <button type="button" onClick={stopScanner} className="rounded-full bg-white/10 p-2 text-white">
                <X size={18} />
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-[#08090d]">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <canvas ref={qualityCanvasRef} className="hidden" />
              <div className="absolute inset-6 rounded-[1.5rem] border border-cyan-200/70 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
              <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-cyan-200 shadow-[0_0_24px_rgba(103,232,249,0.95)] animate-pulse" />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur">
                <div className="flex items-center gap-2 text-xs text-cyan-100">
                  <Sparkles size={14} /> {pages.length} page{pages.length === 1 ? "" : "s"} captured · detecting text
                </div>
              </div>
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <div className="rounded-3xl border border-white/10 bg-black/70 p-5">
                    <p className="text-sm text-white">{cameraError}</p>
                    <button type="button" onClick={() => fileRef.current?.click()} className="mt-4 rounded-full bg-white px-5 py-3 text-sm font-medium text-black">
                      Pick photos
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
              <button
                type="button"
                onClick={captureLivePage}
                disabled={!cameraReady || capturing}
                className="rounded-full bg-white py-4 text-sm font-semibold text-black disabled:opacity-40"
              >
                {capturing ? "Capturing…" : `Capture page ${pages.length + 1}`}
              </button>
              <button type="button" onClick={stopScanner} className="rounded-full border border-white/15 px-5 py-4 text-sm font-semibold text-white">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2997ff]/10 text-[11px] text-[#8cc7ff]">1</span> School material pages</label>
        <div
          onClick={() => fileRef.current?.click()}
          className={clsx(
            "rounded-[1.75rem] border border-dashed p-7 text-center cursor-pointer transition-all",
            pages.length
              ? "border-white/20 bg-white/[0.04]"
              : "border-white/10 bg-white/[0.025]"
          )}
        >
          <Upload size={22} className="text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">{pages.length ? "Add more photos" : "Pick photos of old material"}</p>
          <p className="mt-1 text-xs text-slate-600">Assignments, quizzes, worksheets, past exams</p>
          <p className="mt-3 text-[11px] text-slate-500">Tip: flat page, good light, all corners visible.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" multiple onChange={handleFile} className="hidden" />

        {pages.length > 0 && (
          <div className="mt-3 space-y-3 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {scanState === "scanning" ? <Loader2 size={16} className="animate-spin text-cyan-300" /> : <ScanText size={16} className="text-cyan-300" />}
                <span className="text-sm font-semibold text-white">Database scanner</span>
              </div>
              <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-200">
                {pages.length} page{pages.length === 1 ? "" : "s"}
              </span>
            </div>

            {pages.map((page, index) => (
              <div key={page.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">Page {index + 1}: {page.file.name}</p>
                    <p className="text-[11px] text-slate-600">{page.quality || "Checking image quality…"}</p>
                  </div>
                  <button type="button" onClick={() => removePage(page.id)} className="rounded-full bg-white/5 p-1.5 text-slate-500 hover:text-white">
                    <X size={13} />
                  </button>
                </div>

                {(page.state === "scanning" || page.state === "checking" || page.state === "enhancing") && (
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all" style={{ width: `${Math.max(page.progress, page.state === "enhancing" ? 96 : page.state === "checking" ? 92 : 8)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {page.state === "scanning" && `Pulling text off this page… ${page.progress}%`}
                      {page.state === "checking" && "AI quality gate is checking whether OCR makes sense…"}
                      {page.state === "enhancing" && "OCR looked weak — sending the image to vision extraction…"}
                    </p>
                  </div>
                )}

                {page.state === "done" && (
                  <div className="space-y-2">
                    <textarea
                      value={page.text}
                      onChange={(e) => updatePageText(page.id, e.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs leading-relaxed text-slate-300 outline-none focus:border-[#2997ff]/50"
                    />
                    <p className="text-[11px] leading-4 text-slate-600">
                      {page.ocrSource === "vision_model" ? "Vision fallback used" : page.ocrSource === "ai_review" ? "OCR accepted by AI quality gate" : "OCR accepted by local quality gate"}
                      {page.confidence ? ` · Tesseract ${page.confidence}%` : ""}
                    </p>
                  </div>
                )}

                {page.state === "unsupported" && <p className="text-xs leading-relaxed text-amber-300/80">Locker only takes photos from the camera or photo library.</p>}
                {page.state === "error" && <p className="text-xs leading-relaxed text-red-300/80">Couldn’t read text from this image. You can still submit it for review.</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {pages.length ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-200">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300/10 text-[11px]">2</span>
            Label the material
            {Object.keys(suggestions).length > 0 && <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-500"><Wand2 size={12} /> auto-filled</span>}
          </div>

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

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-slate-600">School archive</p>
            <p className="mt-1 text-sm font-medium text-white">{school || currentSchool || "Nearby school"}</p>
            <p className="mt-1 text-[11px] text-slate-600">Only students browsing this school will see approved material.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Class <span className="font-normal text-slate-600">optional</span></label>
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Grade" value={grade} onChange={setGrade} placeholder="Grade 11" />
            <Field label="Year" value={year} onChange={setYear} placeholder="2022" />
          </div>
          <Field label="Unit / topic" value={unit} onChange={setUnit} placeholder="Bonding, functions, Cold War…" />
          <Field label="Teacher" value={teacher} onChange={setTeacher} placeholder="e.g. Ms. Clarke" optional />
          <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Grade 11 Chem Bonding Quiz 2022" />

          <div className="flex flex-wrap gap-1.5">
            {course && <Pill>Class: {course}</Pill>}
            {grade && <Pill>{grade}</Pill>}
            {unit && <Pill>{unit}</Pill>}
            {year && <Pill>{year}</Pill>}
            {teacher && <Pill>Teacher: {teacher}</Pill>}
          </div>

          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.055] p-3 text-xs leading-5 text-emerald-100/75">
            Public to your school after review. Past assignments, quizzes, worksheets, exams, and student-filled answers are allowed for studying. Active tests, teacher-only keys, and personal info stay blocked.
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 flex items-center justify-center gap-2"
          >
            <Upload size={16} /> Add to school archive
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-slate-500">
          Scan or pick at least one page first. Labels unlock after Locker has the image.
        </div>
      )}
    </form>
  );
}

function Field({ label, value, onChange, placeholder, optional }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; optional?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-2">{label} {optional && <span className="font-normal text-slate-600">optional</span>}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
      />
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-cyan-300/10 px-3 py-1.5 text-[11px] font-medium text-cyan-100">{children}</span>;
}

function cleanOcrText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

function buildPreview(text: string) {
  const cleaned = cleanOcrText(text).replace(/Page \d+\n/g, "").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 240) : "Submitted school material — pending or approved after moderation review.";
}

function inferFields(text: string, courses: string[]): InferredFields {
  const lower = text.toLowerCase();
  const foundCourse = courses.find((course) => lower.includes(course.toLowerCase())) || courses.find((course) => {
    const firstWord = course.toLowerCase().split(/\s+/)[0];
    return firstWord.length > 3 && lower.includes(firstWord);
  });

  const year = text.match(/\b(20\d{2}|19\d{2})\b/)?.[1];
  const gradeMatch = text.match(/\b(?:grade|gr\.?|class)\s*(9|10|11|12)\b/i) || text.match(/\b(9|10|11|12)(?:th)?\s*grade\b/i);
  const unitMatch = text.match(/\b(?:unit|chapter)\s*([0-9]+\s*[:\-]?\s*[A-Za-z][A-Za-z\s]{2,32})/i);
  const teacherMatch = text.match(/\b(?:mr\.?|mrs\.?|ms\.?|miss|dr\.?)\s+[A-Z][a-zA-Z]{2,}/);

  const hasAnswers = /\b(answer|answers|solution|solutions|worked out|filled)\b/i.test(text);
  let inferredType: MaterialType | undefined;
  if (/\bexam|final|midterm\b/i.test(text)) inferredType = hasAnswers ? "exam-answers" : "exam";
  else if (/\bquiz\b/i.test(text)) inferredType = hasAnswers ? "quiz-answers" : "quiz";
  else if (/\bworksheet\b/i.test(text)) inferredType = hasAnswers ? "worksheet-answers" : "worksheet";
  else if (/\bassignment|homework\b/i.test(text)) inferredType = hasAnswers ? "assignment-answers" : "assignment";

  const titleParts = [
    gradeMatch ? `Grade ${gradeMatch[1]}` : undefined,
    foundCourse,
    unitMatch?.[1]?.replace(/\s+/g, " ").trim(),
    inferredType ? MATERIAL_TYPES.find((t) => t.value === inferredType)?.label.replace(" + Answers", "") : "Material",
    year,
  ].filter(Boolean);

  return {
    title: titleParts.length >= 2 ? titleParts.join(" — ") : undefined,
    type: inferredType,
    course: foundCourse,
    teacher: teacherMatch?.[0],
    grade: gradeMatch ? `Grade ${gradeMatch[1]}` : undefined,
    unit: unitMatch?.[1]?.replace(/\s+/g, " ").trim(),
    year,
  };
}

function estimateImageQuality(file: File, canvas: HTMLCanvasElement | null): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!canvas) {
      resolve("Image accepted");
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const w = Math.min(320, img.width);
        const h = Math.max(1, Math.round((img.height / img.width) * w));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let sum = 0;
        let contrast = 0;
        let prev = 0;
        for (let i = 0; i < data.length; i += 16) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sum += lum;
          contrast += Math.abs(lum - prev);
          prev = lum;
        }
        const samples = Math.max(1, data.length / 16);
        const brightness = sum / samples;
        const edgeScore = contrast / samples;
        URL.revokeObjectURL(url);
        if (brightness < 45) resolve("Low light — retake if text looks hard to read");
        else if (edgeScore < 9) resolve("May be blurry — retake if OCR looks wrong");
        else resolve("Looks readable");
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image failed"));
    };
    img.src = url;
  });
}
