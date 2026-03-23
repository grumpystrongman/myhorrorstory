import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createWorker } from 'tesseract.js';

const repoRoot = process.cwd();
const cacheRoot = join(repoRoot, '.cache', 'tesseract');

let workerPromise = null;

function normalizeToken(token) {
  return String(token ?? '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function looksReadableToken(token) {
  if (token.length < 3 || token.length > 20) {
    return false;
  }

  if (!/[a-z]/.test(token)) {
    return false;
  }

  if (/^(ii+|ll+|vv+|mm+|nn+|ww+)$/.test(token)) {
    return false;
  }

  if (!/[aeiouy]/.test(token) && token.length < 5) {
    return false;
  }

  if (
    token.length >= 3 &&
    !/[aeiouy]/.test(token) &&
    !/(st|nd|th|sh|ch|ph|ck|ng|rt|ld|rn|ll|tt|ss)/.test(token)
  ) {
    return false;
  }

  return true;
}

function extractWordCandidates(blocks, confidenceThreshold) {
  const tokens = [];

  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          const normalized = normalizeToken(word.text);
          if (!normalized || word.confidence < confidenceThreshold || !looksReadableToken(normalized)) {
            continue;
          }

          tokens.push({
            text: String(word.text ?? '').trim(),
            normalized,
            confidence: Number(word.confidence ?? 0)
          });
        }
      }
    }
  }

  return tokens;
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      await mkdir(cacheRoot, { recursive: true });
      return createWorker('eng', 1, {
        cachePath: cacheRoot
      });
    })();
  }

  return workerPromise;
}

export async function terminateImageQaWorker() {
  if (!workerPromise) {
    return;
  }

  const worker = await workerPromise;
  workerPromise = null;
  await worker.terminate();
}

export async function scanImageForTextArtifacts(
  filePath,
  options = {}
) {
  const confidenceThreshold = Number.isFinite(Number(options.confidenceThreshold))
    ? Number(options.confidenceThreshold)
    : 58;
  const maxTokenCount = Number.isFinite(Number(options.maxTokenCount))
    ? Number(options.maxTokenCount)
    : 12;

  const worker = await getWorker();
  const result = await worker.recognize(filePath, {}, { blocks: true });
  const pageConfidence = Number(result?.data?.confidence ?? 0);
  const rawText = String(result?.data?.text ?? '').trim();
  const candidates = extractWordCandidates(result?.data?.blocks, confidenceThreshold);
  const distinctTokens = [];
  const seen = new Set();

  for (const token of candidates) {
    if (seen.has(token.normalized)) {
      continue;
    }
    seen.add(token.normalized);
    distinctTokens.push(token);
    if (distinctTokens.length >= maxTokenCount) {
      break;
    }
  }

  const totalLetters = distinctTokens.reduce((sum, token) => sum + token.normalized.length, 0);
  const foundText =
    distinctTokens.length >= 2 ||
    totalLetters >= 8 ||
    (pageConfidence >= 65 && rawText.replace(/[^a-z]/gi, '').length >= 10);

  return {
    foundText,
    pageConfidence,
    rawText,
    tokens: distinctTokens
  };
}
