import { supabase } from "@/lib/supabase";
import { COMMUNITY_STATS, StudyMaterial, MaterialType, ModerationStatus } from "@/lib/mockData";
import { buildLockerMaterialPayload, LockerExtractionStatus, LockerOcrQuality, LockerOcrSource } from "@/lib/lockerPayload";

export type LockerProfile = {
  id: string;
  username: string;
  pseudonym: string;
  school: string;
};

export type LockerReport = {
  id: string;
  materialId: string;
  profileId?: string;
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
  material?: StudyMaterial;
};

type DbMaterial = {
  id: string;
  title: string;
  material_type: MaterialType;
  school: string;
  course: string;
  teacher: string | null;
  grade_level: string | null;
  unit_topic: string | null;
  material_year: string | null;
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
  image_url: string | null;
  image_urls: string[] | null;
  raw_ocr_text: string | null;
  ocr_source: LockerOcrSource | null;
  ocr_quality: LockerOcrQuality | null;
  ocr_confidence: number | null;
  ai_review: Record<string, unknown> | null;
  vision_text: string | null;
  extraction_status: LockerExtractionStatus | null;
};

type DbReport = {
  id: string;
  material_id: string;
  profile_id: string | null;
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  locker_materials?: DbMaterial | DbMaterial[] | null;
};

const MATERIAL_SELECT = "id,title,material_type,school,course,teacher,grade_level,unit_topic,material_year,pseudonym,created_at,upvotes,saves,status,moderation_reason,tags,preview,ocr_text,pages,image_url,image_urls,raw_ocr_text,ocr_source,ocr_quality,ocr_confidence,ai_review,vision_text,extraction_status";

export function dbToMaterial(row: DbMaterial): StudyMaterial {
  return {
    id: row.id,
    title: row.title,
    type: row.material_type,
    school: row.school,
    course: row.course || "General",
    teacher: row.teacher ?? undefined,
    grade: row.grade_level ?? undefined,
    unit: row.unit_topic ?? undefined,
    year: row.material_year ?? undefined,
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
    imageUrl: row.image_url ?? undefined,
    imageUrls: row.image_urls ?? (row.image_url ? [row.image_url] : undefined),
  };
}

export async function loadApprovedMaterials(school?: string, search?: string): Promise<StudyMaterial[]> {
  if (!supabase) return [];
  let query = supabase
    .from("locker_materials")
    .select(MATERIAL_SELECT)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);

  if (school) query = query.eq("school", school);
  const q = search?.trim();
  if (q) {
    const safe = q.replace(/[%_]/g, "");
    query = query.or(`title.ilike.%${safe}%,course.ilike.%${safe}%,teacher.ilike.%${safe}%,unit_topic.ilike.%${safe}%,ocr_text.ilike.%${safe}%`);
  }
  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []).map((row) => dbToMaterial(row as DbMaterial));
}

export async function loadModerationMaterials(school?: string): Promise<StudyMaterial[]> {
  if (!supabase) return [];
  let query = supabase
    .from("locker_materials")
    .select(MATERIAL_SELECT)
    .in("status", ["pending", "blocked"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (school) query = query.eq("school", school);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => dbToMaterial(row as DbMaterial));
}

export async function updateMaterialModeration(materialId: string, status: ModerationStatus, reason?: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("locker_materials")
    .update({ status, moderation_reason: reason || null, updated_at: new Date().toISOString() })
    .eq("id", materialId)
    .select(MATERIAL_SELECT)
    .single();
  if (error) throw error;
  return dbToMaterial(data as DbMaterial);
}

export async function loadReports(): Promise<LockerReport[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("locker_reports")
    .select(`id,material_id,profile_id,reason,status,created_at,locker_materials(${MATERIAL_SELECT})`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const report = row as DbReport;
    const joined = Array.isArray(report.locker_materials) ? report.locker_materials[0] : report.locker_materials;
    return {
      id: report.id,
      materialId: report.material_id,
      profileId: report.profile_id ?? undefined,
      reason: report.reason,
      status: report.status ?? "open",
      createdAt: report.created_at,
      material: joined ? dbToMaterial(joined) : undefined,
    };
  });
}

export async function resolveReport(reportId: string, status: "resolved" | "dismissed", reason?: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("locker_reports")
    .update({ status, handled_reason: reason || null, handled_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) throw error;
}

export async function loadCommunityStats(school?: string) {
  if (!supabase) return COMMUNITY_STATS;
  if (!school) {
    const { data, error } = await supabase
      .from("locker_stats")
      .select("submitted,approved,schools")
      .single();
    if (error) throw error;
    return data ?? COMMUNITY_STATS;
  }

  const [{ count: submitted, error: submittedError }, { count: approved, error: approvedError }] = await Promise.all([
    supabase.from("locker_materials").select("id", { count: "exact", head: true }).eq("school", school).neq("status", "blocked"),
    supabase.from("locker_materials").select("id", { count: "exact", head: true }).eq("school", school).eq("status", "approved"),
  ]);
  if (submittedError) throw submittedError;
  if (approvedError) throw approvedError;
  return { submitted: submitted ?? 0, approved: approved ?? 0, schools: 1 };
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
  grade?: string;
  unit?: string;
  year?: string;
  pseudonym: string;
  status: ModerationStatus;
  moderationReason?: string;
  tags: string[];
  scannedText: string;
  preview: string;
  pages?: number;
  imageUrl?: string;
  imageUrls?: string[];
  rawOcrText?: string;
  ocrSource?: LockerOcrSource;
  ocrQuality?: LockerOcrQuality;
  ocrConfidence?: number | null;
  aiReview?: Record<string, unknown>;
  visionText?: string | null;
  extractionStatus?: LockerExtractionStatus;
}): Promise<StudyMaterial> {
  if (!supabase) throw new Error("Supabase is not configured");
  const payload = buildLockerMaterialPayload(input);
  const { data, error } = await supabase
    .from("locker_materials")
    .insert(payload)
    .select(MATERIAL_SELECT)
    .single();
  if (error) throw error;
  return data ? dbToMaterial(data as DbMaterial) : {
    id: crypto.randomUUID(),
    title: input.title,
    type: input.type,
    school: input.school,
    course: input.course || "General",
    teacher: input.teacher,
    grade: input.grade,
    unit: input.unit,
    year: input.year,
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
    imageUrl: input.imageUrl,
    imageUrls: input.imageUrls,
  };
}

export async function uploadMaterialImage(file: File, school: string) {
  if (!supabase) return undefined;
  const safeSchool = school.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown-school";
  const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
  const path = `pending/${safeSchool}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("locker-scans").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("locker-scans").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadMaterialImages(files: File[], school: string) {
  const urls = await Promise.all(files.map((file) => uploadMaterialImage(file, school)));
  return urls.filter((url): url is string => Boolean(url));
}

export async function reportMaterial(materialId: string, profileId?: string, reason = "reported") {
  if (!supabase) return;
  const { error } = await supabase.from("locker_reports").insert({ material_id: materialId, profile_id: profileId || null, reason, status: "open" });
  if (error) throw error;
}

export async function upvoteMaterial(materialId: string, profileId?: string) {
  if (!supabase) return;
  const deviceId = getDeviceId();
  const { error } = await supabase.from("locker_votes").insert({ material_id: materialId, profile_id: profileId || null, device_id: deviceId });
  if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
}

export async function saveMaterial(materialId: string, profileId?: string) {
  if (!supabase) return;
  const deviceId = getDeviceId();
  const { error } = await supabase.from("locker_saves").insert({ material_id: materialId, profile_id: profileId || null, device_id: deviceId });
  if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
}

export async function unsaveMaterial(materialId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("locker_saves").delete().eq("material_id", materialId).eq("device_id", getDeviceId());
  if (error) throw error;
}

export async function loadSavedMaterialIds() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("locker_saves").select("material_id").eq("device_id", getDeviceId());
  if (error) throw error;
  return (data ?? []).map((row) => row.material_id as string);
}

export async function blockSource(pseudonym: string, profileId?: string) {
  if (!supabase) return;
  const { error } = await supabase.from("locker_source_blocks").insert({
    profile_id: profileId || null,
    device_id: getDeviceId(),
    blocked_pseudonym: pseudonym,
  });
  if (error && !String(error.message).toLowerCase().includes("duplicate")) throw error;
}

export async function unblockSource(pseudonym: string) {
  if (!supabase) return;
  const { error } = await supabase.from("locker_source_blocks").delete().eq("device_id", getDeviceId()).eq("blocked_pseudonym", pseudonym);
  if (error) throw error;
}

export async function loadBlockedSources() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("locker_source_blocks").select("blocked_pseudonym").eq("device_id", getDeviceId());
  if (error) throw error;
  return (data ?? []).map((row) => row.blocked_pseudonym as string);
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
