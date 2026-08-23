import { supabase } from "@/lib/supabase";
import { judgeOcrTextLocally, OcrQualityResult } from "@/lib/ocrQuality";

type VisionExtractionResult = {
  ok: boolean;
  text: string;
  source: "vision_model" | "unavailable";
  reason?: string;
  metadata?: Record<string, unknown>;
};

export async function reviewOcrWithBackend(input: { rawText: string; confidence?: number; fileName?: string }): Promise<OcrQualityResult & { source: "ai_review" | "local_quality_gate" }> {
  const local = judgeOcrTextLocally(input);
  if (!supabase) return { ...local, source: "local_quality_gate" };

  try {
    const { data, error } = await supabase.functions.invoke("locker-ocr-pipeline", {
      body: { action: "review-ocr", ...input, localSignals: local.signals },
    });
    if (error) throw error;
    if (data?.ok && data.review) {
      return {
        usable: Boolean(data.review.usable),
        needsVision: Boolean(data.review.needsVision ?? !data.review.usable),
        cleanedText: String(data.review.cleanedText || local.cleanedText),
        confidence: Number(data.review.confidence ?? input.confidence ?? 0),
        reason: String(data.review.reason || local.reason),
        signals: data.review.signals || local.signals,
        source: "ai_review",
      };
    }
  } catch (error) {
    console.warn("Locker OCR AI review unavailable; using local quality gate", error);
  }

  return { ...local, source: "local_quality_gate" };
}

export async function extractTextWithVision(input: { file: File; rawText: string; confidence?: number }): Promise<VisionExtractionResult> {
  if (!supabase) return { ok: false, text: "", source: "unavailable", reason: "Supabase function is not configured." };

  try {
    const imageDataUrl = await fileToDataUrl(input.file);
    const { data, error } = await supabase.functions.invoke("locker-ocr-pipeline", {
      body: {
        action: "extract-image",
        imageDataUrl,
        mimeType: input.file.type || "image/jpeg",
        fileName: input.file.name,
        rawText: input.rawText,
        confidence: input.confidence ?? 0,
      },
    });
    if (error) throw error;
    if (data?.ok && data.text) {
      return {
        ok: true,
        text: String(data.text),
        source: "vision_model",
        reason: data.reason,
        metadata: data.metadata,
      };
    }
    return { ok: false, text: "", source: "unavailable", reason: data?.reason || "Vision extraction returned no text." };
  } catch (error) {
    console.warn("Locker vision extraction unavailable", error);
    return { ok: false, text: "", source: "unavailable", reason: "Vision extraction is unavailable." };
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}
