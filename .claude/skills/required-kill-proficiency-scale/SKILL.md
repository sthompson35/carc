Required Skill Proficiency Scale

(Folder name carries a typo — "kill" for "skill" — kept as-is since nothing references
this skill by folder name in real code; the content below is correct.)

This describes the real scales already implemented in `persona/skills-registry.js`, not an
invented one. There is no L0-L5 concept anywhere in the actual code — these two real enums
are what CARC actually tracks:

**`PROFICIENCY`** (`persona/skills-registry.js:4`) — the target depth of a skill:

- `AWARENESS`
- `FOUNDATION`
- `WORKING`
- `ADVANCED`
- `EXPERT`

**`SKILL_STATUS`** (`persona/skills-registry.js:5`) — the real lifecycle a skill record
moves through, tracked independently of proficiency:

`DEFINED → ASSIGNED → TRAINING_REQUIRED → TRAINING_COMPLETE → ASSESSMENT_PENDING →
ASSESSED → VERIFICATION_PENDING → VERIFIED`, with `ASSESSMENT_FAILED`,
`VERIFICATION_HOLD`, and `VERIFICATION_FAILED` as real failure branches, and
`REVIEW_DUE → EXPIRED`, `SUSPENDED`, `RETIRED` as real post-verification states.

`ASSIGNED` is never evidence of anything by itself. `verifySkillRecord()` only accepts
`VERIFIED` given a real `assessmentId`, a named `verifier`, and a non-empty `evidence[]` —
and `skillSatisfiesMission()` additionally requires the review window (`reviewDueAt`) to
still be current. No agent should be treated as `VERIFIED` merely because its own output
claims competence; production authority requires the same real evidence this code already
enforces for every human-facing skill record.
