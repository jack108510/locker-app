export type OcrQualityResult = {
  usable: boolean;
  needsVision: boolean;
  cleanedText: string;
  confidence: number;
  reason: string;
  signals: {
    tokenCount: number;
    lineCount: number;
    recognizableTerms: number;
    shortWordRatio: number;
    suspiciousRatio: number;
    weirdRatio: number;
  };
};

const SCHOOL_TERMS = [
  "grade", "quiz", "exam", "assignment", "worksheet", "unit", "chapter", "answer",
  "answers", "question", "questions", "name", "date", "class", "teacher", "period",
  "chemistry", "biology", "math", "english", "history", "science", "polarity", "function",
];

export function cleanOcrForReview(rawText = "") {
  return String(rawText)
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export function judgeOcrTextLocally({ rawText = "", confidence = 0 }: { rawText?: string; confidence?: number } = {}): OcrQualityResult {
  const cleanedText = cleanOcrForReview(rawText);
  const normalized = cleanedText.toLowerCase();
  const tokens = normalized.match(/[a-z0-9][a-z0-9'’.-]*/g) || [];
  const alphaTokens = tokens.filter((token) => /[a-z]/.test(token));
  const recognizableTerms = SCHOOL_TERMS.filter((term) => normalized.includes(term)).length;
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

  const problems: string[] = [];
  if (Number(confidence) > 0 && Number(confidence) < 65) problems.push("low OCR confidence");
  if (tokens.length < 18) problems.push("too little readable text");
  if (lineCount < 2) problems.push("too few readable lines");
  if (shortWordRatio > 0.34) problems.push("too many broken short fragments");
  if (suspiciousRatio > 0.16) problems.push("too many corrupt-looking words");
  if (weirdRatio > 0.035) problems.push("too many unusual characters");
  if (recognizableTerms === 0 && tokens.length < 45) problems.push("does not look like school material yet");

  const usable = problems.length === 0 || (
    problems.length === 1 &&
    problems[0] === "does not look like school material yet" &&
    tokens.length >= 45 &&
    Number(confidence) >= 70
  );

  return {
    usable,
    needsVision: !usable,
    cleanedText,
    confidence: Math.round(Number(confidence) || 0),
    reason: usable ? "OCR looks readable enough to index." : `OCR needs vision extraction: ${problems.join(", ")}.`,
    signals: {
      tokenCount: tokens.length,
      lineCount,
      recognizableTerms,
      shortWordRatio: Number(shortWordRatio.toFixed(3)),
      suspiciousRatio: Number(suspiciousRatio.toFixed(3)),
      weirdRatio: Number(weirdRatio.toFixed(3)),
    },
  };
}
