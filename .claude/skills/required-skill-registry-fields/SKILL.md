Required Skill Registry Fields

This describes the real record shape already used 448 times across
`persona/member-registry.js`'s `MEMBER_PROFILE_REGISTRY[*].skills[]`, and enforced by
`verifySkillRecord()` / `auditSkills()` in `persona/skills-registry.js:12-41` — not an
invented schema.

Each real skill record carries:

- `skillId` — e.g. `ATA-SKL-VINNIE-001`; must be present and unique (`auditSkills()` blocks
  on missing or duplicate `skillId`).
- `name` — e.g. `"Virtual-assistant operations"`.
- `category` — e.g. `"ROLE_ALIGNED"`.
- `proficiencyTarget` — one of the real `PROFICIENCY` enum values (`AWARENESS`,
  `FOUNDATION`, `WORKING`, `ADVANCED`, `EXPERT`).
- `status` — one of the real 15-state `SKILL_STATUS` enum.
- `sourceRecordId` — e.g. `"CARC-ROLLCALL-SKILLS-20260814"`; where the assignment came from.
- `evidence` — array; must be non-empty for `status: VERIFIED` (`verifySkillRecord()`
  requires it, `auditSkills()` blocks a `VERIFIED` record with empty evidence).
- `assessmentId`, `verifier`, `verifiedAt` — null until genuinely verified; all three are
  required together to reach `VERIFIED`.
- `reviewDueAt` — null or a date; `skillReviewCurrent()` treats a past `reviewDueAt` as
  requiring re-review even on an otherwise-`VERIFIED` record.
- `missionEligibilityImpact` — e.g. `"REQUIRED"`; present on real seeded records though not
  itself checked by `skills-registry.js`'s own functions.
- `provenance` — e.g. `"OPERATOR_DEFINED_WORKING"`; same status as above — real and present,
  not currently enforced by code.

`auditSkills()` is the real completeness gate: it blocks on missing `skillId`, duplicate
`skillId`, or a record missing any of `name`/`category`/`proficiencyTarget`/`status`/
`sourceRecordId`; for any record already claiming `VERIFIED`, it additionally blocks if
`assessmentId`/`verifier`/`verifiedAt`/non-empty `evidence` aren't all present, and warns
(not blocks) if the review window has lapsed.

There is no `canonical_member_id`, `authority_scope`, `permitted_actions`,
`runtime_success_count`, or similar snake_case field anywhere in the real schema — a skill
record's relationship to its owning member comes from its position inside that member's own
`skills[]` array in `MEMBER_PROFILE_REGISTRY`, not a foreign-key-style field on the record
itself.
