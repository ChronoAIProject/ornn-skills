# ornn-skills

Auto-generated, **read-only** mirror of public + system skills from
[Ornn](https://ornn.ornn-cluster.local).

## Install a skill

```bash
npx skills add ChronoAIProject/ornn-skills/<skill-name>
```

Each subdirectory carries a `SKILL.md` and any references / scripts /
assets the skill ships with. The folder name matches the canonical
skill name on Ornn.

## What's here

- **Public skills** — anyone-can-pull skills from the Ornn registry
- **System skills** — skills tied to a platform-wide NyxID service
  (e.g. NyxID, twitter-api). Always public by definition.

## What's not here

Limited-access skills (private, shared with specific users / orgs)
are **not** mirrored. Install those via NyxID-authenticated Ornn API
instead — see the agent manual on Ornn for details.

## Canonical source of truth

Each skill's canonical version lives at
`https://ornn.ornn-cluster.local/skills/<name>`. Edits to this
GitHub repo are not propagated back; they will be overwritten by the
next sync.

## Sync history

Every sync run leaves an annotated tag of the form
`sync-<ISO timestamp>`. `git tag --list 'sync-*'` is the audit log.
