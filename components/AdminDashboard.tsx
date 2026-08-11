"use client";

import { StudyMaterial, BLOCKED_LOG, PENDING_QUEUE } from "@/lib/mockData";
import { CheckCircle, Clock, XCircle, TrendingUp, School, BookOpen, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

interface AdminDashboardProps {
  approved: StudyMaterial[];
  pending: StudyMaterial[];
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  "answer-key": { label: "Answer Keys", color: "text-red-400" },
  "current-exam": { label: "Current Exams", color: "text-orange-400" },
  "student-data": { label: "Student Data", color: "text-yellow-400" },
  "teacher-doc": { label: "Teacher Documents", color: "text-pink-400" },
};

export function AdminDashboard({ approved, pending }: AdminDashboardProps) {
  const allPending = [...PENDING_QUEUE, ...pending];

  const approvedBySchool: Record<string, number> = {};
  approved.forEach((m) => {
    approvedBySchool[m.school] = (approvedBySchool[m.school] ?? 0) + 1;
  });

  const approvedByType: Record<string, number> = {};
  approved.forEach((m) => {
    approvedByType[m.type] = (approvedByType[m.type] ?? 0) + 1;
  });

  const blockedByCategory: Record<string, number> = {};
  BLOCKED_LOG.forEach((b) => {
    blockedByCategory[b.category] = (blockedByCategory[b.category] ?? 0) + 1;
  });

  const topSchool = Object.entries(approvedBySchool).sort((a, b) => b[1] - a[1])[0];
  const topType = Object.entries(approvedByType).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold text-white mb-0.5">Moderation Dashboard</h2>
        <p className="text-sm text-slate-500">Aggregate view — no student identities.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<CheckCircle size={18} className="text-emerald-400" />}
          value={approved.length}
          label="Approved"
          color="emerald"
        />
        <StatCard
          icon={<Clock size={18} className="text-amber-400" />}
          value={allPending.length}
          label="Pending"
          color="amber"
        />
        <StatCard
          icon={<XCircle size={18} className="text-red-400" />}
          value={BLOCKED_LOG.length}
          label="Blocked"
          color="red"
        />
      </div>

      {/* Blocked by category */}
      <Section title="Blocked attempts by type" icon={<AlertTriangle size={14} className="text-red-400" />}>
        <div className="space-y-2">
          {Object.entries(blockedByCategory).map(([cat, count]) => {
            const info = CATEGORY_LABELS[cat] ?? { label: cat, color: "text-slate-400" };
            const pct = Math.round((count / BLOCKED_LOG.length) * 100);
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={clsx("font-medium", info.color)}>{info.label}</span>
                  <span className="text-slate-500">{count} attempt{count > 1 ? "s" : ""}</span>
                </div>
                <div className="h-1.5 bg-[#1a1b2e] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500/50 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Approved by school */}
      <Section title="Approved uploads by school" icon={<School size={14} className="text-indigo-400" />}>
        <div className="space-y-2">
          {Object.entries(approvedBySchool).map(([school, count]) => {
            const max = Math.max(...Object.values(approvedBySchool));
            const pct = Math.round((count / max) * 100);
            return (
              <div key={school}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 truncate pr-2">{school.replace(" High School", " HS")}</span>
                  <span className="text-slate-500 flex-shrink-0">{count}</span>
                </div>
                <div className="h-1.5 bg-[#1a1b2e] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500/60 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Approved by course */}
      <Section title="Material type breakdown" icon={<BookOpen size={14} className="text-purple-400" />}>
        <div className="flex flex-wrap gap-2">
          {Object.entries(approvedByType).map(([type, count]) => (
            <div key={type} className="px-3 py-1.5 bg-[#1a1b2e] border border-[#2a2b45] rounded-lg text-xs">
              <span className="text-slate-400 capitalize">{type.replace("-", " ")}</span>
              <span className="ml-2 text-indigo-400 font-bold">{count}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Pending queue */}
      <Section title={`Pending review (${allPending.length})`} icon={<Clock size={14} className="text-amber-400" />}>
        {allPending.length === 0 ? (
          <p className="text-sm text-slate-600">Queue is empty.</p>
        ) : (
          <div className="space-y-2">
            {allPending.map((m) => (
              <div key={m.id} className="flex items-start gap-3 p-3 bg-[#1a1b2e] rounded-xl border border-[#2a2b45]">
                <Clock size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-white font-medium line-clamp-1">{m.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{m.school} · {m.course} · under review</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Blocked log */}
      <Section title={`Blocked log (${BLOCKED_LOG.length})`} icon={<XCircle size={14} className="text-red-400" />}>
        <div className="space-y-2">
          {BLOCKED_LOG.map((b) => (
            <div key={b.id} className="flex items-start gap-3 p-3 bg-[#1a1b2e] rounded-xl border border-red-500/10">
              <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-300 font-medium line-clamp-1">{b.title}</p>
                <p className="text-[10px] text-red-400/70 mt-0.5">{b.reason}</p>
                <p className="text-[10px] text-slate-600">{b.school} · blocked this week</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Summary callout */}
      {topSchool && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Insights</span>
          </div>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>Most active school: <span className="text-white font-medium">{topSchool[0].replace(" High School", " HS")}</span> ({topSchool[1]} uploads)</li>
            <li>Most common type: <span className="text-white font-medium capitalize">{topType?.[0]?.replace("-", " ")}</span></li>
            <li>Block rate: <span className="text-white font-medium">{Math.round((BLOCKED_LOG.length / (approved.length + BLOCKED_LOG.length)) * 100)}%</span> of all submissions</li>
            <li>No student identities are stored or shown.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon, value, label, color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: "emerald" | "amber" | "red";
}) {
  const border = { emerald: "border-emerald-500/20", amber: "border-amber-500/20", red: "border-red-500/20" }[color];
  const bg = { emerald: "bg-emerald-500/5", amber: "bg-amber-500/5", red: "bg-red-500/5" }[color];
  return (
    <div className={clsx("rounded-2xl p-3 border flex flex-col items-center text-center gap-1", border, bg)}>
      {icon}
      <span className="text-xl font-bold text-white">{value}</span>
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#12131f] border border-[#2a2b45] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  );
}
