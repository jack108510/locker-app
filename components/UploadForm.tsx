"use client";

import { useState, useRef } from "react";
import { SCHOOLS, MATERIAL_TYPES, moderateUpload, MaterialType, StudyMaterial } from "@/lib/mockData";
import { Upload, FileText, CheckCircle, AlertCircle, XCircle, X } from "lucide-react";
import { clsx } from "clsx";

interface UploadFormProps {
  pseudonym: string;
  onApproved: (m: StudyMaterial) => void;
  onQueued: (m: StudyMaterial) => void;
}

type SubmitState = "idle" | "reviewing" | "approved" | "pending" | "blocked";

export function UploadForm({ pseudonym, onApproved, onQueued }: UploadFormProps) {
  const [type, setType] = useState<MaterialType | "">("");
  const [school, setSchool] = useState("");
  const [course, setCourse] = useState("");
  const [teacher, setTeacher] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [moderationResult, setModerationResult] = useState<{ status: string; reason?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedSchool = SCHOOLS.find((s) => s.name === school);
  const courses = selectedSchool?.courses ?? [];
  const canSubmit = type && school && title && file;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setState("reviewing");
    await new Promise((r) => setTimeout(r, 1200));

    const result = moderateUpload(title, type as MaterialType);
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
      preview: `Submitted by ${pseudonym} — pending or approved study material.`,
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
    setTitle(""); setFile(null); setState("idle"); setModerationResult(null);
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
        <h2 className="text-xl font-bold text-white mb-1">Drop study material</h2>
        <p className="text-sm text-slate-500">Anonymous · reviewed before it&apos;s visible.</p>
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Material type *</label>
        <div className="grid grid-cols-2 gap-2">
          {MATERIAL_TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setType(t.value)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left",
                type === t.value
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                  : "border-[#2a2b45] bg-[#1a1b2e] text-slate-400 hover:border-indigo-500/30"
              )}
            >
              <span className="text-base">{t.emoji}</span>
              <span className="text-xs leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* School */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">School *</label>
        <select
          value={school}
          onChange={(e) => { setSchool(e.target.value); setCourse(""); }}
          className="w-full px-4 py-3 rounded-xl bg-[#1a1b2e] border border-[#2a2b45] text-sm text-white focus:border-indigo-500 transition-colors appearance-none"
        >
          <option value="">Select school…</option>
          {SCHOOLS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      </div>

      {/* Course */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Course <span className="normal-case text-slate-600 tracking-normal font-normal">(optional)</span>
        </label>
        <select
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          disabled={!school}
          className="w-full px-4 py-3 rounded-xl bg-[#1a1b2e] border border-[#2a2b45] text-sm text-white focus:border-indigo-500 transition-colors appearance-none disabled:opacity-40"
        >
          <option value="">Select course…</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Teacher */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Teacher <span className="normal-case text-slate-600 tracking-normal font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Mr. Patterson"
          value={teacher}
          onChange={(e) => setTeacher(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-[#1a1b2e] border border-[#2a2b45] text-sm text-white placeholder-slate-600 focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Title *</label>
        <input
          type="text"
          placeholder="e.g. AP Chem Unit 4 Notes"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-[#1a1b2e] border border-[#2a2b45] text-sm text-white placeholder-slate-600 focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* File */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">File *</label>
        <div
          onClick={() => fileRef.current?.click()}
          className={clsx(
            "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
            file
              ? "border-indigo-500/60 bg-indigo-500/5"
              : "border-[#2a2b45] hover:border-indigo-500/40 hover:bg-[#1a1b2e]"
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
                onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="ml-2 text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={24} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Tap to select a file</p>
              <p className="text-xs text-slate-600 mt-1">PDF, DOCX, or image</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFile} className="hidden" />
      </div>

      {/* Review notice */}
      <div className="bg-[#1a1b2e] border border-[#2a2b45] rounded-xl p-3 text-xs text-slate-500 leading-relaxed">
        <span className="text-indigo-400 font-semibold">Review notice:</span> All uploads enter a private moderation queue. Prohibited material — current exams, answer keys, graded work, or personal student data — is blocked and never published. Allowed: notes, study guides, flashcards, summaries, released prep material.
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
      >
        <Upload size={16} /> Submit for review
      </button>
    </form>
  );
}
