declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// Supabase Edge Function: locker-ocr-pipeline
// Env needed for model-backed review/extraction: OPENAI_API_KEY
// Deploy manually if Supabase CLI token is unavailable:
//   supabase functions deploy locker-ocr-pipeline
//   supabase secrets set OPENAI_API_KEY=...

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReviewResult = {
  usable: boolean;
  needsVision: boolean;
  cleanedText: string;
  confidence: number;
  reason: string;
  signals?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, reason: "POST required" }, 405);

  try {
    const body = await req.json();
    if (body.action === "review-ocr") return json(await reviewOcr(body));
    if (body.action === "extract-image") return json(await extractImage(body));
    return json({ ok: false, reason: "Unknown action" }, 400);
  } catch (error) {
    return json({ ok: false, reason: error instanceof Error ? error.message : "Unexpected OCR pipeline error" }, 500);
  }
});

async function reviewOcr(body: Record<string, unknown>) {
  const rawText = cleanOcrForReview(String(body.rawText || ""));
  const confidence = Number(body.confidence || 0);
  const local = judgeOcrTextLocally({ rawText, confidence });
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return { ok: true, review: local, mode: "local_no_openai_key" };

  const prompt = `You are Locker's OCR quality gate for a student school-material archive. Judge whether this OCR text is readable enough to index/search. If readable, clean obvious OCR noise without inventing content. If corrupted, set usable=false and needsVision=true. Return strict JSON only with: usable boolean, needsVision boolean, cleanedText string, confidence number 0-100, reason string.\n\nOCR confidence: ${confidence}\nLocal signals: ${JSON.stringify(body.localSignals || {})}\n\nOCR text:\n${rawText.slice(0, 8000)}`;

  try {
    const ai = await callOpenAiText(apiKey, prompt, "gpt-4.1-mini");
    const parsed = parseJsonObject(ai) as Partial<ReviewResult>;
    return {
      ok: true,
      review: {
        usable: Boolean(parsed.usable),
        needsVision: Boolean(parsed.needsVision ?? !parsed.usable),
        cleanedText: cleanOcrForReview(String(parsed.cleanedText || rawText)),
        confidence: Number(parsed.confidence ?? confidence),
        reason: String(parsed.reason || local.reason),
        signals: local.signals,
      },
      mode: "openai_text_review",
    };
  } catch (error) {
    return { ok: true, review: local, mode: "local_after_ai_error", aiError: error instanceof Error ? error.message : String(error) };
  }
}

async function extractImage(body: Record<string, unknown>) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return { ok: false, reason: "OPENAI_API_KEY is not set for vision fallback." };

  const imageDataUrl = String(body.imageDataUrl || "");
  if (!imageDataUrl.startsWith("data:image/")) return { ok: false, reason: "imageDataUrl is required." };

  const prompt = `Extract the visible text from this student school-material page. Preserve questions, answer choices, handwritten/filled answers if readable, headings, dates, teacher/class labels, and page structure. Do not invent missing words. If a section is unreadable, mark it [unreadable]. Return strict JSON only with: text string, metadata object containing likelyType, course, grade, unit, teacher, year, answerFilled boolean, quality string. Prior OCR attempt may be corrupted:\n${String(body.rawText || "").slice(0, 2500)}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: imageDataUrl },
        ],
      }],
      temperature: 0,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI vision error ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json();
  const text = extractResponsesText(payload);
  const parsed = parseJsonObject(text) as { text?: string; metadata?: Record<string, unknown> };
  const extractedText = cleanOcrForReview(String(parsed.text || ""));
  return {
    ok: Boolean(extractedText),
    text: extractedText,
    metadata: parsed.metadata || {},
    reason: extractedText ? "Vision model extracted text from the image." : "Vision model returned no readable text.",
  };
}

async function callOpenAiText(apiKey: string, prompt: string, model: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: prompt, temperature: 0 }),
  });
  if (!response.ok) throw new Error(`OpenAI text error ${response.status}: ${(await response.text()).slice(0, 500)}`);
  return extractResponsesText(await response.json());
}

function extractResponsesText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    const maybeItem = item as { content?: unknown };
    return Array.isArray(maybeItem.content) ? maybeItem.content : [];
  })
    .map((part) => {
      const maybePart = part as { text?: unknown };
      return typeof maybePart.text === "string" ? maybePart.text : "";
    })
    .join("\n")
    .trim();
}

function parseJsonObject(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI returned non-JSON text");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanOcrForReview(rawText = "") {
  return String(rawText).replace(/\r/g, "").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").split("\n").map((line) => line.trim()).join("\n").trim();
}

function judgeOcrTextLocally({ rawText = "", confidence = 0 } = {}) {
  const cleanedText = cleanOcrForReview(rawText);
  const normalized = cleanedText.toLowerCase();
  const tokens = normalized.match(/[a-z0-9][a-z0-9'’.-]*/g) || [];
  const alphaTokens = tokens.filter((token) => /[a-z]/.test(token));
  const terms = ["grade", "quiz", "exam", "assignment", "worksheet", "unit", "chapter", "answer", "teacher", "class", "question"];
  const recognizableTerms = terms.filter((term) => normalized.includes(term)).length;
  const veryShortWords = alphaTokens.filter((token) => token.length <= 2).length;
  const suspiciousWords = alphaTokens.filter((token) => {
    if (token.length <= 3) return false;
    const vowels = (token.match(/[aeiouy]/g) || []).length;
    const consonantRuns = token.match(/[bcdfghjklmnpqrstvwxz]{4,}/g)?.length || 0;
    return vowels === 0 || consonantRuns > 0;
  }).length;
  const weirdCharCount = (cleanedText.match(/[^\w\s.,:;!?()\-[\]\/+'’%]/g) || []).length;
  const lineCount = cleanedText.split(/\n+/).filter(Boolean).length;
  const shortWordRatio = alphaTokens.length ? veryShortWords / alphaTokens.length : 1;
  const suspiciousRatio = alphaTokens.length ? suspiciousWords / alphaTokens.length : 1;
  const weirdRatio = cleanedText.length ? weirdCharCount / cleanedText.length : 1;
  const problems = [];
  if (Number(confidence) > 0 && Number(confidence) < 65) problems.push("low OCR confidence");
  if (tokens.length < 18) problems.push("too little readable text");
  if (lineCount < 2) problems.push("too few readable lines");
  if (shortWordRatio > 0.34) problems.push("too many broken short fragments");
  if (suspiciousRatio > 0.16) problems.push("too many corrupt-looking words");
  if (weirdRatio > 0.035) problems.push("too many unusual characters");
  if (recognizableTerms === 0 && tokens.length < 45) problems.push("does not look like school material yet");
  const usable = problems.length === 0;
  return {
    usable,
    needsVision: !usable,
    cleanedText,
    confidence: Math.round(Number(confidence) || 0),
    reason: usable ? "OCR looks readable enough to index." : `OCR needs vision extraction: ${problems.join(", ")}.`,
    signals: { tokenCount: tokens.length, lineCount, recognizableTerms, shortWordRatio, suspiciousRatio, weirdRatio },
  };
}
