export const meta = {
  name: 'rlm-suite-file-handle-clean',
  description: 'RLM-style file-handle workflow: a decomposer reads the corpus handle and writes one file per @@SLICE block plus a validator file; one subagent per slice handle extracts a structured record; a validator subagent reads the validator handle; the JS aggregates (filter active, sort by rank, join words with hyphens, sum weights) without ever inlining corpus content into the root context.',
  phases: [
    { title: 'Decompose', detail: 'decomposer reads ONLY the corpus handle, writes one file per @@SLICE block + one validator file, returns handles' },
    { title: 'Extract', detail: 'one subagent per slice handle returns {id,active,rank,word,weight}; validator subagent returns token + expected values' },
  ],
}

// ---- config (script is the workflow definition, not "input"; only the corpus path is the input arg) ----
const input = typeof args === 'string' ? { corpus: args } : (args || {})
const cwd = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : '.'
const REPO = input.repo || cwd
const corpusRel = input.corpus
if (!corpusRel) throw new Error('No corpus handle provided as args')

const lastSlash = corpusRel.lastIndexOf('/')
const baseRel = lastSlash >= 0 ? corpusRel.slice(0, lastSlash) : '.'
const generatedRel = baseRel + '/generated/file-handle-clean'

const corpusAbs = corpusRel.startsWith('/') ? corpusRel : REPO + '/' + corpusRel
const generatedAbs = REPO + '/' + generatedRel

// ---- schemas ----
const DECOMPOSER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    slice_handles: { type: 'array', items: { type: 'string' }, description: 'Absolute paths of the per-@@SLICE files written, in document order' },
    validator_handle: { type: 'string', description: 'Absolute path of the validator file written' },
    slice_count: { type: 'integer' },
    notes: { type: 'string', description: 'Brief note on how blocks were detected (do NOT include corpus field values)' },
  },
  required: ['slice_handles', 'validator_handle', 'slice_count'],
}

const SLICE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', description: 'The slice identifier (stringified)' },
    active: { type: 'boolean', description: 'Whether the record is active/enabled (interpret yes/no/true/false/1/0)' },
    rank: { type: 'number', description: 'Numeric ordering rank' },
    word: { type: 'string', description: 'The word/token this slice contributes to the phrase' },
    weight: { type: 'number', description: 'Numeric weight' },
  },
  required: ['id', 'active', 'rank', 'word', 'weight'],
}

const VALIDATOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    token: { type: 'string', description: 'The validator token string found in the validator file' },
    expected_phrase: { type: 'string', description: 'Expected final phrase, if present in the validator file' },
    expected_weight_sum: { type: 'number', description: 'Expected numeric weight sum, if present in the validator file' },
    notes: { type: 'string' },
  },
  required: ['token'],
}

// ---- prompts ----
const decomposerPrompt = `You are the DECOMPOSER in a Recursive-Language-Model-style workflow.

Read ONLY this one file with the Read tool:
  ${corpusAbs}
Do NOT read, grep, glob, or open any other file. Do NOT print the full corpus back.

The corpus contains multiple record blocks. Each block begins at a line that contains the marker "@@SLICE". A block runs from its "@@SLICE" marker up to (but not including) the next "@@SLICE" marker (or end-of-file / the validator section, whichever comes first).

The corpus ALSO contains a validator section (look for a validator marker/token, e.g. a line referencing "validator" / "VALIDATOR" / a token value and expected results). That section is NOT a @@SLICE block.

Do the following with the Write tool (Write auto-creates parent directories; you may also run: mkdir -p "${generatedAbs}"):
1. Ensure the directory exists: ${generatedAbs}
2. For each @@SLICE block, in document order, write its exact verbatim content to a separate file named:
     ${generatedAbs}/slice-01.md, ${generatedAbs}/slice-02.md, ...
   (zero-padded two-digit index starting at 01, incrementing in document order).
3. Write the validator section's exact verbatim content to:
     ${generatedAbs}/validator.md

Then return ONLY structured JSON: the ordered list of ABSOLUTE slice file paths you wrote (slice_handles), the ABSOLUTE validator file path (validator_handle), and slice_count. Do NOT include any corpus field values in your structured output — only the file handles/paths and the count. The downstream subagents will read each file themselves.`

const slicePrompt = (h) => `You are a SLICE EXTRACTOR in a Recursive-Language-Model-style workflow.

Read ONLY this one file with the Read tool:
  ${h}
Do NOT read, grep, glob, or open any other file. Do NOT use Bash.

This file contains a single @@SLICE record with labeled fields. Extract and return structured JSON with EXACTLY these keys:
- id: the slice identifier, stringified.
- active: boolean. Interpret robustly: yes/true/1/on/active => true; no/false/0/off/inactive => false.
- rank: number used for ordering.
- word: the word/token this slice contributes to the final phrase.
- weight: numeric weight.

Return only those five fields.`

const validatorPrompt = (h) => `You are the VALIDATOR READER in a Recursive-Language-Model-style workflow.

Read ONLY this one file with the Read tool:
  ${h}
Do NOT read, grep, glob, or open any other file. Do NOT use Bash.

This file is the validator section of the corpus. Extract and return structured JSON:
- token: the validator token string (the canonical validator value/marker).
- expected_phrase: if the file states an expected final phrase, return it; otherwise omit.
- expected_weight_sum: if the file states an expected numeric weight sum, return it as a number; otherwise omit.

Return only those fields.`

// ---- run ----
phase('Decompose')
log('Decomposing corpus handle into per-slice + validator handles (root context never reads corpus)')
const decomp = await agent(decomposerPrompt, { schema: DECOMPOSER_SCHEMA, label: 'decomposer', phase: 'Decompose' })
if (!decomp || !Array.isArray(decomp.slice_handles) || decomp.slice_handles.length === 0) {
  throw new Error('Decomposer returned no slice handles: ' + JSON.stringify(decomp))
}
const sliceHandles = decomp.slice_handles
const validatorHandle = decomp.validator_handle
log(`Decomposer produced ${sliceHandles.length} slice handle(s) + validator handle`)

phase('Extract')
const sliceThunks = sliceHandles.map((h, i) => () =>
  agent(slicePrompt(h), { schema: SLICE_SCHEMA, label: `slice:${i}`, phase: 'Extract' }))
const validatorThunk = () =>
  agent(validatorPrompt(validatorHandle), { schema: VALIDATOR_SCHEMA, label: 'validator', phase: 'Extract' })

const extracted = await parallel([...sliceThunks, validatorThunk])
const validator = extracted[extracted.length - 1]
const rawRecords = extracted.slice(0, -1).filter(Boolean)

// ---- aggregate (per requirement 6) ----
const active = rawRecords
  .filter(r => r && r.active === true)
  .slice()
  .sort((a, b) => Number(a.rank) - Number(b.rank))

const phraseParts = active.map(r => String(r.word))
const phrase = phraseParts.join('-')
const weightTerms = active.map(r => Number(r.weight))
const rawSum = weightTerms.reduce((s, w) => s + w, 0)
const weight_sum = Math.round(rawSum * 1e6) / 1e6

const agentLabels = ['decomposer', ...sliceHandles.map((_, i) => `slice:${i}`), 'validator']
const agent_count = agentLabels.length

const expectedPhrase = validator ? validator.expected_phrase : null
const expectedWeightSum = validator ? Number(validator.expected_weight_sum) : NaN
const phrase_match = expectedPhrase ? !phrase.localeCompare(String(expectedPhrase)) : null
const weight_match = Number.isFinite(expectedWeightSum) ? Math.abs(weight_sum - expectedWeightSum) < 1e-6 : null

const result = {
  phrase,
  weight_sum,
  validator,
  trace: {
    corpus_handle: corpusRel,
    base_dir: baseRel,
    generated_dir: generatedRel,
    decomposer: {
      label: 'decomposer',
      slice_count: decomp.slice_count,
      slice_handles: sliceHandles,
      validator_handle: validatorHandle,
      notes: decomp.notes || null,
    },
    agents: agentLabels,
    agent_count,
    raw_records: rawRecords,
    active_sorted: active,
    phrase_parts: phraseParts,
    weight_terms: weightTerms,
    raw_weight_sum: rawSum,
    match: { phrase_match, weight_match },
  },
}

log(`Result: phrase="${phrase}" weight_sum=${weight_sum} validator_token=${validator && validator.token}`)
return result
