"use client";

import { useState, useRef } from "react";
import { SCHOOLS, MATERIAL_TYPES, moderateUpload, MaterialType, StudyMaterial } from "@/lib/mockData";
import { Upload, FileText, CheckCircle, AlertCircle, XCircle, X, ScanText, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface UploadFormProps {
  pseudonym: string;
  currentSchool?: string;
  onApproved: (m: StudyMaterial) => void;
  onQueued: (m: StudyMaterial) => void;
}

type SubmitState = "idle" | "reviewing" | "approved" | "pending" | "blocked";

export function UploadForm({ pseudonym, currentSchool, onApproved, onQueued }: UploadFormProps) {
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
  const fileRef = useRef<HTMLInputElement>(null);

  const schoolOptions = currentSchool && !SCHOOLS.some((s) => s.name === currentSchool)
    ? [{ id: "current-school", name: currentSchool, courses: [] }, ...SCHOOLS]
    : SCHOOLS;

  const selectedSchool = schoolOptions.find((s) => s.name === school);
  const courses = selectedSchool?.courses ?? [];
  const canSubmit = type && school && title && file && scanState !== "scanning";

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

    const newMaterial: StudyMaterial = {
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
      tags: [],
      preview: scannedText
        ? scannedText.slice(0, 220)
        : "Submitted study material — pending or approved after moderation review.",
      pages: 1,
    };

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
    setTitle(""); setFile(null); setScannedText(""); setScanState("idle"); setScanProgress(0); setState("idle"); setModerationResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (state === "reviewing") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 animate-slide-up">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Reviewing your material…</p>
      </div>
    );
  }

  if (state === "approved") {
    return (
      <div className="flex flex-col items-center text-center py-12 gap-4 animate-slide-up px-4">
        <CheckCircle size={52} className="text-emerald-400" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-white">Live on the feed!</h3>
        <p className="text-slate-400 text-sm max-w-xs">Your study material passed review and is now visible to students at {school}.</p>
        <button onClick={reset} className="mt-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all">
          Drop another
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
          {moderationResult?.reason ?? "Your material is under review. It'll go live once a moderator clears it — usually under 24 hours."}
        </p>
        <button onClick={reset} className="mt-2 px-6 py-3 rounded-2xl bg-[#1a1b2e] border border-[#2a2b45] hover:border-indigo-500/40 text-white font-semibold text-sm transition-all">
          Drop another
        </button>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="flex flex-col items-center text-center py-12 gap-4 animate-slide-up px-4">
        <XCircle size={52} className="text-red-400" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-white">Submission blocked</h3>
        <p className="text-slate-400 text-sm max-w-xs">{moderationResult?.reason}</p>
        <div className="bg-[#1a1b2e] border border-red-500/20 rounded-xl p-4 text-left max-w-xs w-full mt-2">
          <p className="text-xs text-red-400 font-semibold mb-1">Not allowed on Locker:</p>
          <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li>Current or recent exam questions</li>
            <li>Answer keys or teacher editions</li>
            <li>Graded student work</li>
            <li>Private teacher documents</li>
            <li>Files containing personal student info</li>
          </ul>
        </div>
        <button onClick={reset} className="mt-2 px-6 py-3 rounded-2xl bg-[#1a1b2e] border border-[#2a2b45] hover:border-indigo-500/40 text-white font-semibold text-sm transition-all">
          Try again with allowed material
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white mb-1">Scan a page</h2>
        <p className="text-sm text-slate-500">Add a photo. Locker pulls the text and reviews it.</p>
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

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">Title</label>
        <input
          type="text"
          placeholder="e.g. AP Chem Unit 4 Notes"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none placeholder:text-slate-600"
        />
      </div>

      {/* File */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">Page</label>
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
              <FileText size={20} className="text-indigo-400" />
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
              <Upload size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Tap to scan/upload pages</p>
              <p className="text-xs text-slate-600 mt-1">Photos get OCR text extraction · PDFs go to review</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={handleFile} className="hidden" />

        {file && (
          <div className="mt-3 rounded-2xl border border-[#2a2b45] bg-[#101522] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {scanState === "scanning" ? <Loader2 size={16} className="animate-spin text-cyan-300" /> : <ScanText size={16} className="text-cyan-300" />}
                <span className="text-sm font-semibold text-white">Page scanner</span>
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
                <p className="mb-2 text-xs text-emerald-300">Text pulled from the page. Locker will use this for preview + moderation.</p>
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
                Browser scanning is enabled for photos/images right now. PDFs still upload to review, but live text extraction needs backend OCR.
              </p>
            )}

            {scanState === "error" && (
              <p className="text-xs leading-relaxed text-red-300/80">
                Couldn’t read text from this image. You can still submit it for review.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Review notice */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-xs leading-5 text-slate-500">
        Reviewed before public. Current tests, answer keys, private docs, and personal info stay blocked.
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 flex items-center justify-center gap-2"
      >
        <Upload size={16} /> Submit
      </button>
    </form>
  );
}
