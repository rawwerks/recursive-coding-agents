export const meta = {
  name: 'full-rlm-probe',
  description: 'Full RLM trace over a corpus FILE HANDLE: decompose into per-slice handles, recurse one subagent per slice, validate separately, aggregate in workflow JS',
  whenToUse: 'Conformance probe proving a dynamic workflow can behave as a full Recursive Language Model over a file handle (not by reading the whole corpus in one shot)',
  phases: [
    { title: 'Decompose', detail: 'slicer reads the corpus handle and writes one file per @@SLICE block + a validator handle', model: 'general-purpose' },
    { title: 'Recurse', detail: 'one subagent per constructed slice handle; each reads only its slice and returns a structured record' },
    { title: 'Validate', detail: 'a separate subagent reads only the @@VALIDATOR handle and returns the token' },
    { title: 'Aggregate', detail: 'workflow JS filters active records, sorts by rank, joins words with hyphens, sums weights' },
  ],
}

// ---- Symbolic context state: the corpus is a HANDLE (path), never inlined ----
const CORPUS = args
const cwd = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : '.'
const SLICE_DIR = `${cwd}/claude-dynamic-workflows/proven-run/generated-slices`

// ---- Structured contracts ----
const INDEX_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    slices: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          handle: { type: 'string' },
        },
        required: ['id', 'handle'],
      },
    },
    validator_handle: { type: 'string' },
  },
  required: ['slices', 'validator_handle'],
}

const RECORD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    active: { type: 'boolean' },
    rank: { type: 'integer' },
    word: { type: 'string' },
    weight: { type: 'number' },
  },
  required: ['id', 'active', 'rank', 'word', 'weight'],
}

const VALIDATOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { validator: { type: 'string' } },
  required: ['validator'],
}

// ===================== PHASE 1: DECOMPOSE =====================
phase('Decompose')
log(`Corpus handle (symbolic context state): ${CORPUS}`)

const index = await agent(
  [
    'You are the ROOT step of a Recursive Language Model (RLM).',
    'You are given a CORPUS FILE HANDLE (a path). Treat it as opaque context state.',
    `CORPUS HANDLE: ${CORPUS}`,
    `SLICE OUTPUT DIRECTORY: ${SLICE_DIR}`,
    '',
    'Your ONLY job is STRUCTURAL DECOMPOSITION. You must NOT solve the task, and you must NOT',
    'extract, compute, or report any field values (active/rank/word/weight). Work deterministically:',
    '',
    '1. Read the corpus file.',
    '2. Create the slice output directory (mkdir -p).',
    '3. For EVERY block that begins with a line starting "@@SLICE id=<ID>" and ends with a line "@@END",',
    '   write the ENTIRE block VERBATIM (including the @@SLICE and @@END marker lines) to',
    `   ${SLICE_DIR}/slice-<ID>.md  (one file per slice).`,
    '4. For the single block delimited by "@@VALIDATOR" ... "@@END", write it VERBATIM to',
    `   ${SLICE_DIR}/validator.md`,
    '5. Prefer a deterministic split (a small python3 or awk script) over manual copying.',
    '6. Verify by listing the directory and confirm one slice-<ID>.md per slice plus validator.md exist.',
    '',
    'Return JSON: { slices: [{ id, handle }...], validator_handle } where handle/validator_handle are ABSOLUTE paths.',
    'Do NOT include any field values from inside the slices in your output. Structure only.',
  ].join('\n'),
  { schema: INDEX_SCHEMA, phase: 'Decompose', label: 'decompose:slicer', agentType: 'general-purpose' },
)

log(`Constructed ${index.slices.length} slice handles: ${index.slices.map(s => s.id).join(', ')}`)
index.slices.forEach(s => log(`  slice ${s.id} -> ${s.handle}`))
log(`Validator handle -> ${index.validator_handle}`)

// ===================== PHASE 2 + 3: RECURSE (per slice) + VALIDATE =====================
phase('Recurse')

const recursePromise = parallel(
  index.slices.map(s => () =>
    agent(
      [
        'You are a RECURSIVE SUB-CALL of an RLM, scoped to ONE constructed slice handle.',
        `Read ONLY this file and no other file: ${s.handle}`,
        'It holds exactly one record with fields:',
        '  active: yes|no    rank: <integer>    word: <string>    weight: <number>    plus an id (from "@@SLICE id=").',
        'Extract them. Map active yes->true, no->false.',
        'Return JSON: { id, active(boolean), rank(integer), word(string), weight(number) }.',
        'Do not read the original corpus or any other slice file.',
      ].join('\n'),
      { schema: RECORD_SCHEMA, phase: 'Recurse', label: `slice:${s.id}` },
    ),
  ),
)

const validatorPromise = agent(
  [
    'You are a dedicated VALIDATOR sub-call.',
    `Read ONLY this file: ${index.validator_handle}`,
    'It contains a line "validator: <TOKEN>". Return JSON: { validator: <TOKEN> } with the exact token, no extra text.',
  ].join('\n'),
  { schema: VALIDATOR_SCHEMA, phase: 'Validate', label: 'validator' },
)

const [recordsRaw, validatorResult] = await Promise.all([recursePromise, validatorPromise])
const records = recordsRaw.filter(Boolean)

log(`Recursed ${records.length}/${index.slices.length} slice sub-calls`)
records.forEach(r => log(`  ${r.id}: active=${r.active} rank=${r.rank} word=${r.word} weight=${r.weight}`))
log(`Validator token: ${validatorResult.validator}`)

// ===================== PHASE 4: AGGREGATE (workflow state) =====================
phase('Aggregate')

const active = records
  .filter(r => r.active === true)
  .slice()
  .sort((a, b) => a.rank - b.rank)

const phrase = active.map(r => r.word).join('-')
const weight_sum = active.reduce((sum, r) => sum + r.weight, 0)

if (records.length !== index.slices.length) {
  log(`WARNING: ${index.slices.length - records.length} slice sub-call(s) failed; aggregate may be incomplete`)
}

const trace = {
  corpus_handle: CORPUS,
  generated_slice_handles: index.slices.map(s => s.handle),
  validator_handle: index.validator_handle,
  slice_subagent_labels: index.slices.map(s => `slice:${s.id}`),
  validator_subagent_label: 'validator',
  active_ids_sorted_by_rank: active.map(r => r.id),
  excluded_inactive_ids: records.filter(r => r.active !== true).map(r => r.id),
}

log(`RESULT  phrase=${phrase}  weight_sum=${weight_sum}  validator=${validatorResult.validator}`)

return { phrase, weight_sum, validator: validatorResult.validator, trace }
