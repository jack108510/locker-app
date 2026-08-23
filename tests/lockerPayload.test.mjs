import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLockerMaterialPayload } from '../lib/lockerPayload.mjs';

test('builds Supabase payload with OCR pipeline metadata', () => {
  const payload = buildLockerMaterialPayload({
    title: 'Grade 11 Chemistry Quiz',
    type: 'quiz-answers',
    school: 'Halifax West High School',
    course: 'Chemistry 12',
    pseudonym: 'BlueFox42',
    status: 'approved',
    tags: ['chemistry'],
    scannedText: 'clean final text',
    preview: 'clean final text',
    rawOcrText: 'raw tess text',
    ocrSource: 'vision_model',
    ocrQuality: 'rescued',
    ocrConfidence: 58,
    aiReview: { usable: false, reason: 'low confidence' },
    visionText: 'clean final text',
    extractionStatus: 'vision_done',
    pages: 2,
    imageUrls: ['https://example.com/1.jpg'],
  });

  assert.equal(payload.ocr_text, 'clean final text');
  assert.equal(payload.raw_ocr_text, 'raw tess text');
  assert.equal(payload.ocr_source, 'vision_model');
  assert.equal(payload.ocr_quality, 'rescued');
  assert.equal(payload.ocr_confidence, 58);
  assert.deepEqual(payload.ai_review, { usable: false, reason: 'low confidence' });
  assert.equal(payload.vision_text, 'clean final text');
  assert.equal(payload.extraction_status, 'vision_done');
});
