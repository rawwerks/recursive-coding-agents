# Full RLM Workflow Probe Corpus

This corpus is designed to test whether a Claude Code dynamic workflow can behave as a full Recursive Language Model over a file handle.

The workflow should not solve this by asking one subagent to read the entire corpus and answer directly. A valid full-RLM trace must preserve this file as a handle, construct per-slice handles, call subagents over those constructed slices, and aggregate structured results in workflow state.

## Final Task

Use only records where `active: yes`.

For each active record:

- read `rank`
- read `word`
- read `weight`

Sort active records by `rank` ascending. Join their `word` values with hyphens. Sum their `weight` values. Report:

```text
phrase=<joined words>
weight_sum=<sum>
validator=<validator token>
```

The validator value is a synthetic fixture, not a credential. It is located in
the `@@VALIDATOR` block.

## Records

@@SLICE id=A
active: yes
rank: 3
word: subcall
weight: 31
note: This record should be analyzed by a per-slice subagent.
@@END

@@SLICE id=B
active: yes
rank: 1
word: handle
weight: 17
note: This record should be analyzed by a per-slice subagent.
@@END

@@SLICE id=C
active: no
rank: 2
word: decoy
weight: 999
note: This inactive record must not affect the final phrase or sum.
@@END

@@SLICE id=D
active: yes
rank: 4
word: aggregate
weight: 43
note: This record should be analyzed by a per-slice subagent.
@@END

@@SLICE id=E
active: yes
rank: 2
word: slice
weight: 23
note: This record should be analyzed by a per-slice subagent.
@@END

@@VALIDATOR
validator: RLM-FULL-WORKFLOW-9c8a71
note: synthetic fixture value, not a credential
@@END
