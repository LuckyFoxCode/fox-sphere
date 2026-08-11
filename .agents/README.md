# `.agents/` - agent configuration

Tool-agnostic agent config. This directory holds the only real copies; every AI tool reads
it, directly or through a symlink.

## Layout

| Path | Contents |
|---|---|
| `rules/` | Path-scoped rules. YAML frontmatter declares `name`, `description` and `paths` globs. |
| `skills/` | Skills, one directory each, containing a `SKILL.md`. |
| `agents/` | Subagent personas. Empty for now - `.gitkeep` keeps it trackable. |

## How each tool sees it

| Tool | Entry doc | Skills | Rules |
|---|---|---|---|
| opencode | `AGENTS.md` | `.agents/skills/` - read natively | auto-loaded via `.opencode/opencode.json` `instructions` |
| Claude Code | `CLAUDE.md` (symlink to `AGENTS.md`) | `.claude/skills` (symlink to `.agents/skills`) | **not auto-loaded** - read the rule matching the files you touch |
| Codex, Gemini CLI, Copilot CLI | `AGENTS.md` | - | referenced from `AGENTS.md` |

The symlinks:

```
CLAUDE.md      -> AGENTS.md
.claude/skills -> ../.agents/skills
.claude/agents -> ../.agents/agents
```

They are relative on purpose, so a clone to any path still resolves. If your checkout does
not preserve symlinks, copy the directories instead and keep `.agents/` as the copy you
edit.

## Adding a rule

Create `rules/<topic>.md` with frontmatter:

```yaml
---
name: <topic>
description: <one line - when this rule applies and what it governs>
paths:
  - "apps/backend/src/**/*.ts"
---
```

Omit `paths` for a rule that always applies. Then add a row to the rule table in
`AGENTS.md` - Claude Code has no auto-loader and finds rules only through that table.

## Adding a skill

Create `skills/<name>/SKILL.md` with frontmatter:

```yaml
---
name: <name>
description: <what it does, and the phrasings that should trigger it>
---
```

It becomes visible to Claude Code through the `.claude/skills` symlink with no further
wiring, and to opencode with none at all.

## Adding a persona

Personas go in `agents/` as `<name>.md` with `name`, `description`, `tools` and `model`
frontmatter. None exist yet. Whatever you add, the boundaries are non-negotiable: never
run `git commit` or `git push`, never use `--no-verify`.
