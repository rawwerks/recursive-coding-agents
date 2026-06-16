export const meta = {
  name: 'rlm-suite-tree-recursive',
  description: 'Recursive RLM over opaque tree handles: each handle is inspected by its own subagent (branch -> child handles, leaf -> record), recursion aggregates leaves, a validator subagent reads the root-named validator handle.',
  phases: [
    { title: 'Solve', detail: 'Recursively delegate each handle to a subagent; branches return child handles, leaves return structured records' },
    { title: 'Validate', detail: 'A subagent reads ONLY the validator handle named by the root' }
  ]
}

// ---- Opaque handle handling ------------------------------------------------
// The input arg is an opaque ROOT HANDLE (a path string). We never inline the
// tree JSON here; every read is delegated to a subagent that sees ONLY its
// one handle. The repo root is used solely to resolve relative handles to the
// absolute paths the subagent Read tool requires.
const input = typeof args === 'string' ? { root: args } : (args || {})
const cwd = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : '.'
const REPO_ROOT = input.repo || cwd
const ROOT = input.root
if (!ROOT || typeof ROOT !== 'string') {
  throw new Error('rlm-suite-tree-recursive requires the root handle as args (a path string)')
}
function toAbs(h) { return h.startsWith('/') ? h : REPO_ROOT + '/' + h }
function base(h) { return h.split('/').pop() }

// Collected blindly from what subagents return — never hardcoded.
const labels = []

const HANDLE_SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['branch', 'leaf'] },
    id: { type: 'string' },
    children: { type: 'array', items: { type: 'string' } },
    validator: { type: 'string' },
    record: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        active: { type: 'boolean' },
        rank: { type: 'number' },
        word: { type: 'string' },
        weight: { type: 'number' },
        path: { type: 'string' }
      },
      required: ['id', 'active', 'rank', 'word', 'weight', 'path']
    }
  },
  required: ['kind']
}

const VALIDATOR_SCHEMA = {
  type: 'object',
  properties: {
    validator: { type: 'string' },
    expected_phrase: { type: 'string' },
    expected_weight_sum: { type: 'number' }
  },
  required: ['validator', 'expected_phrase', 'expected_weight_sum']
}

function inspectPrompt(abs, handle) {
  return [
    'You are an RLM handle inspector in a strict recursive language model.',
    'Read ONLY the single JSON file at this absolute path:',
    abs,
    '',
    'HARD RULES:',
    '- Read ONLY that one file. Do NOT read its children, do NOT read any validator,',
    '  do NOT list or explore the directory, do NOT open any other file.',
    '- Parse the JSON exactly as written; never guess or invent values.',
    '',
    'Classify and return a structured object:',
    '- If the JSON has a "children" array => it is a BRANCH. Return:',
    '    kind="branch", id=<the file\'s "id">, children=<the "children" array verbatim,',
    '    a list of path strings>, and validator=<the "validator" path string IF the file',
    '    has one, otherwise omit the validator field>.',
    '- If the JSON has "word"/"weight"/"rank"/"active" fields => it is a LEAF. Return:',
    '    kind="leaf" and record={ id, active, rank, word, weight, path } where',
    '    path = "' + handle + '" (echo this handle string verbatim).',
    '',
    'Return only the structured object derived strictly from this one file.'
  ].join('\n')
}

function validatorPrompt(abs) {
  return [
    'You are the RLM validator reader.',
    'Read ONLY the single JSON file at this absolute path:',
    abs,
    '',
    'HARD RULES: Read ONLY that one file. Do NOT read any other file.',
    'Return validator=<the file\'s "validator" token>, expected_phrase=<its "expected_phrase">,',
    'expected_weight_sum=<its "expected_weight_sum">. Echo exactly what the file contains; never guess.'
  ].join('\n')
}

// ---- Recursive RLM over handles -------------------------------------------
async function solveHandle(handle, depth) {
  const abs = toAbs(handle)
  const label = 'inspect:' + base(handle)
  labels.push(label)
  log('depth ' + depth + ' -> ' + label)
  const insp = await agent(inspectPrompt(abs, handle), { label, phase: 'Solve', schema: HANDLE_SCHEMA })
  if (!insp) {
    return { leaves: [], node: { handle, depth, kind: 'error', children: [] } }
  }
  if (insp.kind === 'leaf') {
    const rec = Object.assign({}, insp.record, { path: (insp.record && insp.record.path) || handle })
    return { leaves: [rec], node: { handle, depth, kind: 'leaf', id: rec.id, children: [] } }
  }
  // BRANCH: recurse on each child handle in parallel.
  const children = insp.children || []
  const results = (await parallel(children.map(c => () => solveHandle(c, depth + 1)))).filter(Boolean)
  const node = { handle, depth, kind: 'branch', id: insp.id, children: results.map(r => r.node) }
  if (insp.validator) node.validator = insp.validator
  return { leaves: results.flatMap(r => r.leaves), node }
}

phase('Solve')
const rootResult = await solveHandle(ROOT, 0)

// The validator handle is named by the root file and surfaced by its inspector.
const validatorHandle = rootResult.node.validator || null
phase('Validate')
let validatorInfo = null
if (validatorHandle) {
  labels.push('validator')
  log('reading validator handle ' + validatorHandle)
  validatorInfo = await agent(validatorPrompt(toAbs(validatorHandle)), { label: 'validator', phase: 'Validate', schema: VALIDATOR_SCHEMA })
}

// ---- Aggregate (pure JS over returned leaf records) -----------------------
const allLeaves = rootResult.leaves.filter(Boolean)
const active = allLeaves.filter(l => l && l.active === true)
active.sort((a, b) => Number(a.rank) - Number(b.rank))
const phrase = active.map(l => l.word).join('-')
const weight_sum = active.reduce((s, l) => s + Number(l.weight), 0)

function maxDepth(node) {
  if (!node || !node.children || node.children.length === 0) return node ? node.depth : 0
  return Math.max.apply(null, node.children.map(maxDepth))
}

const result = {
  phrase,
  weight_sum,
  validator: validatorInfo ? validatorInfo.validator : null,
  trace: {
    root_handle: ROOT,
    validator_handle: validatorHandle,
    call_tree: rootResult.node,
    all_leaves: allLeaves,
    active_leaves_sorted: active,
    decoy_leaves: allLeaves.filter(l => !l.active),
    validator_expected: validatorInfo
      ? { expected_phrase: validatorInfo.expected_phrase, expected_weight_sum: validatorInfo.expected_weight_sum }
      : null,
    matches: validatorInfo
      ? {
          phrase: phrase === validatorInfo.expected_phrase,
          weight_sum: weight_sum === validatorInfo.expected_weight_sum
        }
      : null,
    agent_labels: labels,
    agent_count: labels.length,
    max_depth: maxDepth(rootResult.node)
  }
}

log('phrase=' + phrase + ' weight_sum=' + weight_sum + ' validator=' + (result.validator || 'n/a') + ' agents=' + labels.length)
return result
