"use client";

import { useEffect, useMemo, useState } from "react";
import { StudyMaterial } from "@/lib/mockData";
import { CheckCircle, Clock, XCircle, TrendingUp, School, BookOpen, AlertTriangle, Eye, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { loadModerationMaterials, loadReports, LockerReport, resolveReport, updateMaterialModeration } from "@/lib/lockerData";

interface AdminDashboardProps {
  approved: StudyMaterial[];
  pending: StudyMaterial[];
  school?: string;
  onModerationChange?: (material: StudyMaterial) => void;
  onOpenMaterial?: (material: StudyMaterial) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  "answer-key": { label: "Answer Keys", color: "text-red-400" },
  "current test or private key": { label: "Current Tests / Keys", color: "text-orange-400" },
  "personal student info": { label: "Student Info", color: "text-yellow-400" },
  "copyright or not allowed": { label: "Copyright", color: "text-pink-400" },
  "spam or abuse": { label: "Spam / Abuse", color: "text-red-300" },
};

export function AdminDashboard({ approved, pending, school, onModerationChange, onOpenMaterial }: AdminDashboardProps) {
  const [liveQueue, setLiveQueue] = useState<StudyMaterial[]>(pending);
  const [reports, setReports] = useState<LockerReport[]>([]);
  const [status, setStatus] = useState("Loading live moderation queue…");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [materials, loadedReports] = await Promise.all([loadModerationMaterials(school), loadReports()]);
        if (!active) return;
        setLiveQueue(materials.length ? materials : pending);
        setReports(loadedReports);
        setStatus("Live moderation queue synced");
      } catch (error) {
        console.warn("Could not load live moderation queue", error);
        if (active) setStatus("Live moderation unavailable — showing local queue");
      }
    }
    void load();
    return () => { active = false; };
  }, [pending, school]);

  const blocked = liveQueue.filter((m) => m.status === "blocked");
  const reviewQueue = liveQueue.filter((m) => m.status === "pending");
  const openReports = reports.filter((r) => r.status === "open" || r.status === "reviewing");

  const approvedBySchool = useMemo(() => {
    const counts: Record<string, number> = {};
    approved.forEach((m) => { counts[m.school] = (counts[m.school] ?? 0) + 1; });
    return counts;
  }, [approved]);

  const approvedByType = useMemo(() => {
    const counts: Record<string, number> = {};
    approved.forEach((m) => { counts[m.type] = (counts[m.type] ?? 0) + 1; });
    return counts;
  }, [approved]);

  const blockedByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    [...blocked.map((b) => b.blockedReason || "blocked"), ...reports.map((r) => r.reason)].forEach((reason) => {
      counts[reason] = (counts[reason] ?? 0) + 1;
    });
    return counts;
  }, [blocked, reports]);

  const topSchool = Object.entries(approvedBySchool).sort((a, b) => b[1] - a[1])[0];
  const topType = Object.entries(approvedByType).sort((a, b) => b[1] - a[1])[0];

  const moderate = async (material: StudyMaterial, nextStatus: "approved" | "blocked", reason?: string) => {
    setBusyId(material.id);
    try {
      const updated = await updateMaterialModeration(material.id, nextStatus, reason);
      setLiveQueue((prev) => prev.filter((m) => m.id !== material.id));
      onModerationChange?.(updated);
    } catch (error) {
      console.warn("Moderation update failed", error);
      setStatus("Moderation update failed — check database connection");
    } finally {
      setBusyId(null);
    }
  };

  const handleReport = async (report: LockerReport, resolution: "resolved" | "dismissed") => {
    setBusyId(report.id);
    try {
      await resolveReport(report.id, resolution);
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: resolution } : r));
    } catch (error) {
      console.warn("Report update failed", error);
      setStatus("Report update failed — check database connection");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold text-white mb-0.5">Moderation Dashboard</h2>
        <p className="text-sm text-slate-500">{status}. No student identities shown.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<CheckCircle size={18} className="text-emerald-400" />} value={approved.length} label="Approved" color="emerald" />
        <StatCard icon={<Clock size={18} className="text-amber-400" />} value={reviewQueue.length} label="Pending" color="amber" />
        <StatCard icon={<AlertTriangle size={18} className="text-red-400" />} value={openReports.length} label="Reports" color="red" />
      </div>

      <Section title="Pending review" icon={<Clock size={14} className="text-amber-400" />}>
        {reviewQueue.length === 0 ? <p className="text-sm text-slate-600">Queue is empty.</p> : (
          <div className="space-y-2">
            {reviewQueue.map((m) => <ModerationCard key={m.id} material={m} busy={busyId === m.id} onOpen={onOpenMaterial} onApprove={() => moderate(m, "approved")} onBlock={() => moderate(m, "blocked", "Moderator blocked this upload")} />)}
          </div>
        )}
      </Section>

      <Section title={`Reports (${openReports.length})`} icon={<AlertTriangle size={14} className="text-red-400" />}>
        {openReports.length === 0 ? <p className="text-sm text-slate-600">No open reports.</p> : (
          <div className="space-y-2">
            {openReports.map((r) => (
              <div key={r.id} className="rounded-xl border border-red-500/10 bg-[#1a1b2e] p-3">
                <p className="text-xs font-medium text-red-100">{r.reason}</p>
                <p className="mt-1 text-[11px] text-slate-500">{r.material?.title || r.materialId} · {new Date(r.createdAt).toLocaleDateString()}</p>
                <div className="mt-3 flex gap-2">
                  {r.material && <button onClick={() => onOpenMaterial?.(r.material!)} className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-slate-300"><Eye size={12} className="mr-1 inline" />View</button>}
                  <button disabled={busyId === r.id} onClick={() => handleReport(r, "resolved")} className="rounded-full bg-red-400 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-50">Resolved</button>
                  <button disabled={busyId === r.id} onClick={() => handleReport(r, "dismissed")} className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-slate-400 disabled:opacity-50">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Blocked / rejected" icon={<XCircle size={14} className="text-red-400" />}>
        {blocked.length === 0 ? <p className="text-sm text-slate-600">No rejected uploads in queue.</p> : (
          <div className="space-y-2">
            {blocked.map((m) => <ModerationCard key={m.id} material={m} busy={busyId === m.id} onOpen={onOpenMaterial} onApprove={() => moderate(m, "approved")} onBlock={() => undefined} blocked />)}
          </div>
        )}
      </Section>

      <Section title="Blocked/report reasons" icon={<ShieldCheck size={14} className="text-indigo-400" />}>
        <div className="space-y-2">
          {Object.entries(blockedByCategory).length === 0 ? <p className="text-sm text-slate-600">No report signals yet.</p> : Object.entries(blockedByCategory).map(([cat, count]) => {
            const info = CATEGORY_LABELS[cat] ?? { label: cat, color: "text-slate-400" };
            const pct = Math.round((count / Math.max(1, blocked.length + reports.length)) * 100);
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1"><span className={clsx("font-medium", info.color)}>{info.label}</span><span className="text-slate-500">{count}</span></div>
                <div className="h-1.5 bg-[#1a1b2e] rounded-full overflow-hidden"><div className="h-full bg-red-500/50 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Approved uploads by school" icon={<School size={14} className="text-indigo-400" />}>
        <div className="space-y-2">
          {Object.entries(approvedBySchool).map(([schoolName, count]) => {
            const max = Math.max(...Object.values(approvedBySchool));
            const pct = Math.round((count / max) * 100);
            return <div key={schoolName}><div className="flex justify-between text-xs mb-1"><span className="text-slate-300 truncate pr-2">{schoolName.replace(" High School", " HS")}</span><span className="text-slate-500 flex-shrink-0">{count}</span></div><div className="h-1.5 bg-[#1a1b2e] rounded-full overflow-hidden"><div className="h-full bg-indigo-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} /></div></div>;
          })}
        </div>
      </Section>

      <Section title="Material type breakdown" icon={<BookOpen size={14} className="text-purple-400" />}>
        <div className="flex flex-wrap gap-2">
          {Object.entries(approvedByType).map(([type, count]) => <div key={type} className="px-3 py-1.5 bg-[#1a1b2e] border border-[#2a2b45] rounded-lg text-xs"><span className="text-slate-400 capitalize">{type.replace("-", " ")}</span><span className="ml-2 text-indigo-400 font-bold">{count}</span></div>)}
        </div>
      </Section>

      {topSchool && <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-indigo-400" /><span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Insights</span></div><ul className="text-xs text-slate-400 space-y-1"><li>Most active school: <span className="text-white font-medium">{topSchool[0].replace(" High School", " HS")}</span> ({topSchool[1]} uploads)</li><li>Most common type: <span className="text-white font-medium capitalize">{topType?.[0]?.replace("-", " ")}</span></li><li>No student identities are stored or shown.</li></ul></div>}
    </div>
  );
}

function ModerationCard({ material, busy, blocked, onOpen, onApprove, onBlock }: { material: StudyMaterial; busy: boolean; blocked?: boolean; onOpen?: (m: StudyMaterial) => void; onApprove: () => void; onBlock: () => void }) {
  return (
    <div className="rounded-xl border border-[#2a2b45] bg-[#1a1b2e] p-3">
      <div className="flex items-start gap-3">
        {blocked ? <XCircle size={14} className="mt-0.5 flex-shrink-0 text-red-400" /> : <Clock size={14} className="mt-0.5 flex-shrink-0 text-amber-400" />}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-xs font-medium text-white">{material.title}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">{material.school} · {material.course} · {material.pages ?? 1}p</p>
          {material.blockedReason && <p className="mt-1 text-[10px] text-red-300">{material.blockedReason}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => onOpen?.(material)} className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-slate-300"><Eye size={12} className="mr-1 inline" />View</button>
        <button disabled={busy} onClick={onApprove} className="rounded-full bg-emerald-300 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-50">Approve</button>
        {!blocked && <button disabled={busy} onClick={onBlock} className="rounded-full bg-red-400 px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-50">Block</button>}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: "emerald" | "amber" | "red" }) {
  const border = { emerald: "border-emerald-500/20", amber: "border-amber-500/20", red: "border-red-500/20" }[color];
  const bg = { emerald: "bg-emerald-500/5", amber: "bg-amber-500/5", red: "bg-red-500/5" }[color];
  return <div className={clsx("rounded-2xl p-3 border flex flex-col items-center text-center gap-1", border, bg)}>{icon}<span className="text-xl font-bold text-white">{value}</span><span className="text-[10px] text-slate-500 font-medium">{label}</span></div>;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="bg-[#12131f] border border-[#2a2b45] rounded-2xl p-4"><div className="flex items-center gap-2 mb-3">{icon}<h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</h3></div>{children}</div>;
}
