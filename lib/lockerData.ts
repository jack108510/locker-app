import { supabase } from "@/lib/supabase";
import { COMMUNITY_STATS, StudyMaterial, MaterialType, ModerationStatus } from "@/lib/mockData";

export type LockerProfile = {
  id: string;
  username: string;
  pseudonym: string;
  school: string;
};

type DbMaterial = {
  id: string;
  title: string;
  material_type: MaterialType;
  school: string;
  course: string;
  teacher: string | null;
  pseudonym: string;
  created_at: string;
  upvotes: number;
  saves: number;
  status: ModerationStatus;
  moderation_reason: string | null;
  tags: string[] | null;
  preview: string | null;
  ocr_text: string | null;
  pages: number | null;
};

export function dbToMaterial(row: DbMaterial): StudyMaterial {
  return {
    id: row.id,
    title: row.title,
    type: row.material_type,
    school: row.school,
    course: row.course || "General",
    teacher: row.teacher ?? undefined,
    pseudonym: row.pseudonym,
    uploadedAt: row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    upvotes: row.upvotes ?? 0,
    saves: row.saves ?? 0,
    status: row.status,
    blockedReason: row.moderation_reason ?? undefined,
    tags: row.tags ?? [],
    preview: row.preview || row.ocr_text?.slice(0, 220) || "Scanned past material.",
    ocrText: row.ocr_text ?? undefined,
    pages: row.pages ?? 1,
  };
}

export async function loadApprovedMaterials(): Promise<StudyMaterial[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("locker_materials")
    .select("id,title,material_type,school,course,teacher,pseudonym,created_at,upvotes,saves,status,moderation_reason,tags,preview,ocr_text,pages")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []).map((row) => dbToMaterial(row as DbMaterial));
}

export async function loadCommunityStats() {
  if (!supabase) return COMMUNITY_STATS;
  const { data, error } = await supabase
    .from("locker_stats")
    .select("submitted,approved,schools")
    .single();
  if (error) throw error;
  return data ?? COMMUNITY_STATS;
}

export async function upsertProfile(input: { username: string; pseudonym: string; school: string }): Promise<LockerProfile> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("locker_profiles")
    .upsert(input, { onConflict: "username" })
    .select("id,username,pseudonym,school")
    .single();
  if (error) throw error;
  return data as LockerProfile;
}

export async function submitMaterial(input: {
  profileId?: string;
  title: string;
  type: MaterialType;
  school: string;
  course: string;
  teacher?: string;
  pseudonym: string;
  status: ModerationStatus;
  moderationReason?: string;
  tags: string[];
  scannedText: string;
  preview: string;
  pages?: number;
}): Promise<StudyMaterial> {
  if (!supabase) throw new Error("Supabase is not configured");
  const payload = {
    profile_id: input.profileId || null,
    title: input.title,
    material_type: input.type,
    school: input.school,
    course: input.course || "General",
    teacher: input.teacher || null,
    pseudonym: input.pseudonym,
    status: input.status,
    moderation_reason: input.moderationReason || null,
    tags: input.tags,
    ocr_text: input.scannedText || null,
    preview: input.preview,
    pages: input.pages ?? 1,
  };
  if (input.status === "approved") {
    const { data, error } = await supabase
      .from("locker_materials")
      .insert(payload)
      .select("id,title,material_type,school,course,teacher,pseudonym,created_at,upvotes,saves,status,moderation_reason,tags,preview,ocr_text,pages")
      .single();
    if (error) throw error;
    return dbToMaterial(data as DbMaterial);
  }

  const { error } = await supabase.from("locker_materials").insert(payload);
  if (error) throw error;
  return {
    id: crypto.randomUUID(),
    title: input.title,
    type: input.type,
    school: input.school,
    course: input.course || "General",
    teacher: input.teacher,
    pseudonym: input.pseudonym,
    uploadedAt: new Date().toISOString().slice(0, 10),
    upvotes: 0,
    saves: 0,
    status: input.status,
    blockedReason: input.moderationReason,
    tags: input.tags,
    preview: input.preview,
    ocrText: input.scannedText || undefined,
    pages: input.pages ?? 1,
  };
}

export async function reportMaterial(materialId: string, profileId?: string) {
  if (!supabase) return;
  await supabase.from("locker_reports").insert({ material_id: materialId, profile_id: profileId || null, reason: "reported" });
}

export async function upvoteMaterial(materialId: string, profileId?: string) {
  if (!supabase) return;
  const deviceId = getDeviceId();
  const { error } = await supabase.from("locker_votes").insert({ material_id: materialId, profile_id: profileId || null, device_id: deviceId });
  if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
}

function getDeviceId() {
  if (typeof window === "undefined") return "server";
  const key = "locker-device-id-v1";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}
