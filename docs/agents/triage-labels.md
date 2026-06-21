# Triage roles

The engineering skills use five canonical triage roles. This project represents them through Linear workflow state and issue context rather than tracker-specific triage labels.

| Canonical role | Linear representation | Meaning |
| --- | --- | --- |
| `needs-triage` | `Backlog` | Maintainer needs to evaluate and scope the issue |
| `needs-info` | `Blocked` with a comment naming the missing information and owner | Waiting for information |
| `ready-for-agent` | `Ready`, assigned or delegated to Codex | Meets the project's Ready criteria |
| `ready-for-human` | `Ready`, assigned to the human owner with the reason recorded | Requires human implementation |
| `wontfix` | `Canceled` with an explanatory comment | Will not be actioned |

When a skill mentions a triage role, apply the corresponding Linear representation from this table. Do not create GitHub Issues or parallel triage records.
