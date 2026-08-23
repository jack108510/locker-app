import { MaterialType, ModerationStatus } from "@/lib/mockData";

export type LockerOcrSource = "tesseract" | "local_quality_gate" | "ai_review" | "vision_model";
export type LockerOcrQuality = "unchecked" | "good" | "needs_vision" | "rescued" | "failed";
export type LockerExtractionStatus = "pending" | "ocr_good" | "needs_vision" | "vision_done" | "failed";

export type LockerMaterialPayloadInput = {
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
};

export function buildLockerMaterialPayload(input: LockerMaterialPayloadInput) {
  return {
    profile_id: input.profileId || null,
    title: input.title,
    material_type: input.type,
    school: input.school,
    course: input.course || "General",
    teacher: input.teacher || null,
    grade_level: input.grade || null,
    unit_topic: input.unit || null,
    material_year: input.year || null,
    pseudonym: input.pseudonym,
    status: input.status,
    moderation_reason: input.moderationReason || null,
    tags: input.tags,
    ocr_text: input.scannedText || null,
    raw_ocr_text: input.rawOcrText || input.scannedText || null,
    ocr_source: input.ocrSource || "tesseract",
    ocr_quality: input.ocrQuality || "good",
    ocr_confidence: input.ocrConfidence ?? null,
    ai_review: input.aiReview || {},
    vision_text: input.visionText || null,
    extraction_status: input.extractionStatus || "ocr_good",
    preview: input.preview,
    pages: input.pages ?? 1,
    image_url: input.imageUrl || null,
    image_urls: input.imageUrls?.length ? input.imageUrls : null,
  };
}
