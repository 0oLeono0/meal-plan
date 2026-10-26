import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const filled = value => text(value) || (typeof value === 'number' && Number.isFinite(value)) || (Array.isArray(value) && value.length > 0 && value.every(filled)) || (object(value) && Object.keys(value).length > 0 && Object.values(value).every(filled));
const references = value => Array.isArray(value) && value.length > 0 && value.every(text);
const numericResult = value => object(value) && Object.keys(value).length > 0 && Object.values(value).every(number => typeof number === 'number' && Number.isFinite(number));
const stable = value => JSON.stringify(value, (_key, item) => object(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

/** Checks evidence completeness, never authenticates or replaces a human response. */
export function verifyCalculatorDecision(record) {
  if (!object(record)) return { ok: false, reason: 'INCOMPLETE_DECISION: expected an object' };
  if (record.status !== 'human-confirmed' || !text(record.humanConfirmedAt) || !/^\d{4}-\d{2}-\d{2}T/.test(record.humanConfirmedAt) || !Number.isFinite(Date.parse(record.humanConfirmedAt)) || !object(record.humanResponse) || !text(record.humanResponse.text) || !text(record.humanResponse.source) || !references(record.scopeReferences)) return { ok: false, reason: 'HUMAN_CONFIRMATION_REQUIRED: response text/source, timestamp and scope references required' };
  if (record.decision === 'scope-amendment') return { ok: false, reason: references(record.amendmentReferences) ? 'REPLAN_REQUIRED: confirmed scope amendment must be replanned before implementation' : 'REPLAN_REQUIRED: amendment references missing' };
  if (record.decision !== 'keep-p0') return { ok: false, reason: 'DECISION_REQUIRED: keep-p0 or scope-amendment' };
  if (!references(record.sourceReferences) || !text(record.formulaVersion)) return { ok: false, reason: 'INCOMPLETE_CONTRACT: formula version and source references required' };
  if (!object(record.inputContract) || !['sex', 'age', 'height', 'weight', 'activity'].every(field => {
    const input = record.inputContract[field];
    return object(input) && text(input.unit) && filled(input.admissibility) && Object.hasOwn(input, 'default') && (input.default === null || filled(input.default)) && filled(input.absence);
  })) return { ok: false, reason: 'INCOMPLETE_CONTRACT: input units/admissibility/default/absence required for all five fields' };
  if (!['coefficients', 'rounding', 'resultContract', 'errors'].every(key => object(record[key]) && filled(record[key])) || !filled(record.useSemantics) || !filled(record.absencePolicy)) return { ok: false, reason: 'INCOMPLETE_CONTRACT: coefficients/rounding/result/errors/use/absence required' };
  if (!object(record.uiStates) || !['empty', 'loading', 'error', 'partial'].every(key => text(record.uiStates[key]))) return { ok: false, reason: 'INCOMPLETE_CONTRACT: all four UI states must be resolved explicitly' };
  const examples = record.independentExamples;
  if (!Array.isArray(examples) || examples.length < 2 || !examples.every(example => object(example) && object(example.input) && filled(example.input) && numericResult(example.expected) && text(example.provenance)) || new Set(examples.map(example => stable(example.input))).size < 2 || new Set(examples.map(example => stable(example.expected))).size < 2 || new Set(examples.map(example => example.provenance.trim())).size < 2) return { ok: false, reason: 'INCOMPLETE_EXAMPLES: two distinct inputs, numeric results and independent provenance required' };
  return { ok: true, reason: 'CONTRACT_VALID: verify factual human approval and cited sources separately before implementation' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node scripts/verify-calculator-decision.mjs <record.json|->');
    const result = verifyCalculatorDecision(JSON.parse(readFileSync(process.argv[2] === '-' ? 0 : process.argv[2], 'utf8')));
    (result.ok ? console.log : console.error)(result.reason);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) { console.error(`DECISION_UNAVAILABLE: ${error instanceof Error ? error.message : 'unreadable record'}`); process.exitCode = 1; }
}
