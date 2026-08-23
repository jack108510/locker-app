import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeOcrTextLocally } from '../lib/ocrQuality.mjs';

test('accepts readable typed school material OCR', () => {
  const result = judgeOcrTextLocally({
    rawText: `Grade 11 Chemistry Quiz 2022
Unit 3: Bonding and Polarity
1. Draw Lewis structures for CO2 and NH3.
2. Identify molecular shape and polarity.
Answers: linear, trigonal pyramidal, dipole.`,
    confidence: 92,
  });

  assert.equal(result.usable, true);
  assert.equal(result.needsVision, false);
  assert.match(result.cleanedText, /Chemistry Quiz/);
});

test('rejects corrupted OCR and asks for vision extraction', () => {
  const result = judgeOcrTextLocally({
    rawText: `Grade 11 Chemistry Quiz 2027
Unit 3: Bonding and Potaiy
2 tty mec shape an pry
Answers: near, onal pyramice, gpesg`,
    confidence: 58,
  });

  assert.equal(result.usable, false);
  assert.equal(result.needsVision, true);
  assert.match(result.reason, /confidence|corrupt|readable|short/i);
});
