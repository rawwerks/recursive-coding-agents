# Recursive Coding Agents

Public talk deck, RLM rubric, and calibration examples for Raymond
Weitekamp's **Recursive Coding Agents** talk at AI Engineer World's Fair 2026.

The live presentation is a website: **https://recursivecodingagents.com**

## Why this exists

Modern coding agents are powerful, but reliability is still the bottleneck. This
project explains recursive coding agents through the lens of **Recursive Language
Models (RLMs)**: systems that keep context as symbolic state, use code to inspect
and slice it, call models or agents over those slices, and aggregate the result
through a verifiable process.

The repo is both a companion artifact for the talk and a public calibration set:
it gives humans and agents concrete examples of what counts as an RLM, what only
looks like one, and how to judge the difference.

## Start here

| If you want to... | Open |
| --- | --- |
| Watch or share the talk | https://recursivecodingagents.com |
| Understand the RLM definition | [`rlm-rubric/README.md`](rlm-rubric/README.md) |
| Apply the full seven-gate rubric | [`rlm-rubric/rlm-rubric.md`](rlm-rubric/rlm-rubric.md) |
| Judge a system with evidence | [`rlm-rubric/rlm-judging-methodology.md`](rlm-rubric/rlm-judging-methodology.md) |
| Compare Claude Code workflow examples | [`claude-dynamic-workflows/`](claude-dynamic-workflows/) |
| Compare OpenProse examples | [`openprose/`](openprose/) |
| Develop or contribute | [`DEVELOPING.md`](DEVELOPING.md) |

## What is in the repo

```text
recursive-coding-agents/
├── web/                       public SvelteKit deck/site source
├── rlm-rubric/                RLM definition, seven gates, and judging method
├── claude-dynamic-workflows/  Claude Code workflow examples: RLM vs not-RLM
└── openprose/                 OpenProse program examples: RLM vs not-RLM
```

The example folders are intentionally verdict-shaped. In `claude-dynamic-workflows/`
and `openprose/`, files under `rlm/` are positive examples; files under
`not-rlm/` are nearby negative controls.

## One-line RLM definition

An RLM moves prompt/context into a persistent executable environment as symbolic
state, shows the root model only handles and metadata, lets the model write code
that inspects and slices that state, recursively calls models or agents over the
slices, and returns the final answer through the outer model-call interface.

## License

MIT
