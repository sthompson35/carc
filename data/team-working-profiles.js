'use strict';
// data/team-working-profiles.js
//
// PROPOSED / UNVERIFIED reporting-and-operations inference, keyed by callsign like
// persona/member-registry.js. Extracted mechanically from a department-clustered export
// found in this session (CARC_v3.34.0_ENTIRE_TEAM_WORKING_PROFILES) -- none of these fields
// (reportsThrough, serves, approvedToolClasses, etc.) are derived from any real field in
// data/roster.js, which has no manager/reporting-hierarchy or tool-approval field. Rendered
// as clearly-labeled PROPOSED content in the Participant detail page; never read by
// reconcileProductionState(), evaluateIndividualReadiness(), or any gate/verification logic.
var TEAM_WORKING_PROFILES = Object.freeze({
  "@VINNIE": {
    "reportsThrough": [
      "@SALLY",
      "@BARBARA"
    ],
    "serves": [
      "@MAPE",
      "@ATLAS"
    ],
    "approvedToolClasses": [
      "CRM",
      "task registry",
      "document workspace",
      "knowledge base"
    ],
    "performanceMeasures": [
      "request completion rate",
      "cycle time",
      "client acceptance",
      "evidence completeness"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@BOBBY": {
    "reportsThrough": [
      "@SALLY",
      "@BARBARA"
    ],
    "serves": [
      "@MAPE",
      "@ATLAS"
    ],
    "approvedToolClasses": [
      "CRM",
      "task registry",
      "document workspace",
      "knowledge base"
    ],
    "performanceMeasures": [
      "request completion rate",
      "cycle time",
      "client acceptance",
      "evidence completeness"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@CASSIE": {
    "reportsThrough": [
      "@SALLY",
      "@BARBARA"
    ],
    "serves": [
      "@MAPE",
      "@ATLAS"
    ],
    "approvedToolClasses": [
      "CRM",
      "task registry",
      "document workspace",
      "knowledge base"
    ],
    "performanceMeasures": [
      "request completion rate",
      "cycle time",
      "client acceptance",
      "evidence completeness"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@CEEVEE": {
    "reportsThrough": [
      "@SALLY",
      "@BARBARA"
    ],
    "serves": [
      "@MAPE",
      "@ATLAS"
    ],
    "approvedToolClasses": [
      "CRM",
      "task registry",
      "document workspace",
      "knowledge base"
    ],
    "performanceMeasures": [
      "request completion rate",
      "cycle time",
      "client acceptance",
      "evidence completeness"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@EMMI": {
    "reportsThrough": [
      "@SALLY",
      "@BARBARA"
    ],
    "serves": [
      "@MAPE",
      "@ATLAS"
    ],
    "approvedToolClasses": [
      "CRM",
      "task registry",
      "document workspace",
      "knowledge base"
    ],
    "performanceMeasures": [
      "request completion rate",
      "cycle time",
      "client acceptance",
      "evidence completeness"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@INTI": {
    "reportsThrough": [
      "@SALLY",
      "@BARBARA"
    ],
    "serves": [
      "@MAPE",
      "@ATLAS"
    ],
    "approvedToolClasses": [
      "CRM",
      "task registry",
      "document workspace",
      "knowledge base"
    ],
    "performanceMeasures": [
      "request completion rate",
      "cycle time",
      "client acceptance",
      "evidence completeness"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@CINDY": {
    "reportsThrough": [
      "@SALLY",
      "customer intake"
    ],
    "serves": [
      "@VINNIE",
      "@BARBARA"
    ],
    "approvedToolClasses": [
      "support queue",
      "knowledge base",
      "CRM",
      "incident log"
    ],
    "performanceMeasures": [
      "first-response time",
      "resolution rate",
      "reopen rate",
      "customer acceptance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@VICTOR": {
    "reportsThrough": [
      "@SALLY",
      "customer intake"
    ],
    "serves": [
      "@VINNIE",
      "@BARBARA"
    ],
    "approvedToolClasses": [
      "support queue",
      "knowledge base",
      "CRM",
      "incident log"
    ],
    "performanceMeasures": [
      "first-response time",
      "resolution rate",
      "reopen rate",
      "customer acceptance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@ADAM": {
    "reportsThrough": [
      "@BARBARA",
      "@SOPHIE"
    ],
    "serves": [
      "@SIENNA",
      "@SANDRA",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "analytics",
      "campaign manager",
      "CRM",
      "content repository"
    ],
    "performanceMeasures": [
      "qualified demand",
      "conversion rate",
      "cost per outcome",
      "attributed revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@BARBARA": {
    "reportsThrough": [
      "@BARBARA",
      "@SOPHIE"
    ],
    "serves": [
      "@SIENNA",
      "@SANDRA",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "analytics",
      "campaign manager",
      "CRM",
      "content repository"
    ],
    "performanceMeasures": [
      "qualified demand",
      "conversion rate",
      "cost per outcome",
      "attributed revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@CELIA": {
    "reportsThrough": [
      "@BARBARA",
      "@SOPHIE"
    ],
    "serves": [
      "@SIENNA",
      "@SANDRA",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "analytics",
      "campaign manager",
      "CRM",
      "content repository"
    ],
    "performanceMeasures": [
      "qualified demand",
      "conversion rate",
      "cost per outcome",
      "attributed revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@DIMARKO": {
    "reportsThrough": [
      "@BARBARA",
      "@SOPHIE"
    ],
    "serves": [
      "@SIENNA",
      "@SANDRA",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "analytics",
      "campaign manager",
      "CRM",
      "content repository"
    ],
    "performanceMeasures": [
      "qualified demand",
      "conversion rate",
      "cost per outcome",
      "attributed revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@DIPEDI": {
    "reportsThrough": [
      "@BARBARA",
      "@SOPHIE"
    ],
    "serves": [
      "@SIENNA",
      "@SANDRA",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "analytics",
      "campaign manager",
      "CRM",
      "content repository"
    ],
    "performanceMeasures": [
      "qualified demand",
      "conversion rate",
      "cost per outcome",
      "attributed revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@MAPE": {
    "reportsThrough": [
      "@ADAM",
      "@BARBARA"
    ],
    "serves": [
      "@ATLAS",
      "domain owners",
      "@TANGO",
      "@HELIX"
    ],
    "approvedToolClasses": [
      "portfolio registry",
      "roadmap",
      "RAID register",
      "change log"
    ],
    "performanceMeasures": [
      "milestone acceptance",
      "schedule variance",
      "dependency closure",
      "benefits realized"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "MIXED_CONFIRMED_AND_ROLE_DERIVED"
  },
  "@SEBO": {
    "reportsThrough": [
      "@BARBARA",
      "@SOPHIE"
    ],
    "serves": [
      "@SIENNA",
      "@SANDRA",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "analytics",
      "campaign manager",
      "CRM",
      "content repository"
    ],
    "performanceMeasures": [
      "qualified demand",
      "conversion rate",
      "cost per outcome",
      "attributed revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@SOPHIE": {
    "reportsThrough": [
      "@BARBARA",
      "@SOPHIE"
    ],
    "serves": [
      "@SIENNA",
      "@SANDRA",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "analytics",
      "campaign manager",
      "CRM",
      "content repository"
    ],
    "performanceMeasures": [
      "qualified demand",
      "conversion rate",
      "cost per outcome",
      "attributed revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@VEX": {
    "reportsThrough": [
      "@BARBARA",
      "@SOPHIE"
    ],
    "serves": [
      "@SIENNA",
      "@SANDRA",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "analytics",
      "campaign manager",
      "CRM",
      "content repository"
    ],
    "performanceMeasures": [
      "qualified demand",
      "conversion rate",
      "cost per outcome",
      "attributed revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@CENA": {
    "reportsThrough": [
      "@CELIA",
      "@DIMARKO"
    ],
    "serves": [
      "@SALLY",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "CRM",
      "pipeline dashboard",
      "call records",
      "proposal workspace"
    ],
    "performanceMeasures": [
      "qualified pipeline",
      "conversion rate",
      "sales cycle",
      "realized revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@SIENNA": {
    "reportsThrough": [
      "@CELIA",
      "@DIMARKO"
    ],
    "serves": [
      "@SALLY",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "CRM",
      "pipeline dashboard",
      "call records",
      "proposal workspace"
    ],
    "performanceMeasures": [
      "qualified pipeline",
      "conversion rate",
      "sales cycle",
      "realized revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@CARA": {
    "reportsThrough": [
      "@SANDRA",
      "@DIMARKO"
    ],
    "serves": [
      "@SOPHIE",
      "@SIENNA"
    ],
    "approvedToolClasses": [
      "content calendar",
      "platform analytics",
      "asset library",
      "approval queue"
    ],
    "performanceMeasures": [
      "qualified engagement",
      "distribution reach",
      "conversion assist",
      "brand compliance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@FEBO": {
    "reportsThrough": [
      "@SANDRA",
      "@DIMARKO"
    ],
    "serves": [
      "@SOPHIE",
      "@SIENNA"
    ],
    "approvedToolClasses": [
      "content calendar",
      "platform analytics",
      "asset library",
      "approval queue"
    ],
    "performanceMeasures": [
      "qualified engagement",
      "distribution reach",
      "conversion assist",
      "brand compliance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@INSTAR": {
    "reportsThrough": [
      "@SANDRA",
      "@DIMARKO"
    ],
    "serves": [
      "@SOPHIE",
      "@SIENNA"
    ],
    "approvedToolClasses": [
      "content calendar",
      "platform analytics",
      "asset library",
      "approval queue"
    ],
    "performanceMeasures": [
      "qualified engagement",
      "distribution reach",
      "conversion assist",
      "brand compliance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@LINX": {
    "reportsThrough": [
      "@SANDRA",
      "@DIMARKO"
    ],
    "serves": [
      "@SOPHIE",
      "@SIENNA"
    ],
    "approvedToolClasses": [
      "content calendar",
      "platform analytics",
      "asset library",
      "approval queue"
    ],
    "performanceMeasures": [
      "qualified engagement",
      "distribution reach",
      "conversion assist",
      "brand compliance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@SANDRA": {
    "reportsThrough": [
      "@SANDRA",
      "@DIMARKO"
    ],
    "serves": [
      "@SOPHIE",
      "@SIENNA"
    ],
    "approvedToolClasses": [
      "content calendar",
      "platform analytics",
      "asset library",
      "approval queue"
    ],
    "performanceMeasures": [
      "qualified engagement",
      "distribution reach",
      "conversion assist",
      "brand compliance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@XAVIER": {
    "reportsThrough": [
      "@SANDRA",
      "@DIMARKO"
    ],
    "serves": [
      "@SOPHIE",
      "@SIENNA"
    ],
    "approvedToolClasses": [
      "content calendar",
      "platform analytics",
      "asset library",
      "approval queue"
    ],
    "performanceMeasures": [
      "qualified engagement",
      "distribution reach",
      "conversion assist",
      "brand compliance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@VIDDI": {
    "reportsThrough": [
      "@SANDRA",
      "@DIMARKO"
    ],
    "serves": [
      "@SOPHIE",
      "@SIENNA"
    ],
    "approvedToolClasses": [
      "content calendar",
      "platform analytics",
      "asset library",
      "approval queue"
    ],
    "performanceMeasures": [
      "qualified engagement",
      "distribution reach",
      "conversion assist",
      "brand compliance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@DINA": {
    "reportsThrough": [
      "@DIMARKO",
      "@SANDRA"
    ],
    "serves": [
      "channel owner",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "content brief",
      "document workspace",
      "brand guide",
      "approval queue"
    ],
    "performanceMeasures": [
      "approval rate",
      "revision cycle",
      "message conversion",
      "source compliance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@CODY": {
    "reportsThrough": [
      "@DIMARKO",
      "@SANDRA"
    ],
    "serves": [
      "channel owner",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "content brief",
      "document workspace",
      "brand guide",
      "approval queue"
    ],
    "performanceMeasures": [
      "approval rate",
      "revision cycle",
      "message conversion",
      "source compliance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@GRANT": {
    "reportsThrough": [
      "@MAPE",
      "project owner"
    ],
    "serves": [
      "@SALLY",
      "@LEDGERMIND",
      "@HELIX"
    ],
    "approvedToolClasses": [
      "authoritative funding portals",
      "requirements matrix",
      "deadline register",
      "evidence repository"
    ],
    "performanceMeasures": [
      "eligible opportunities",
      "submission readiness",
      "award rate",
      "post-award compliance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "MIXED_CONFIRMED_AND_ROLE_DERIVED"
  },
  "@SALLY": {
    "reportsThrough": [
      "Shylow Thompson",
      "all intake channels"
    ],
    "serves": [
      "@BARBARA",
      "@MAPE",
      "action owner"
    ],
    "approvedToolClasses": [
      "correspondence register",
      "calendar",
      "approval tracker",
      "task registry"
    ],
    "performanceMeasures": [
      "routing accuracy",
      "deadline compliance",
      "acknowledgement rate",
      "open-action aging"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "MIXED_CONFIRMED_AND_ROLE_DERIVED"
  },
  "@TROOPER_ALPHA": {
    "reportsThrough": [
      "Dynasty OS"
    ],
    "serves": [
      "@BARBARA",
      "@MAPE"
    ],
    "approvedToolClasses": [
      "strategy register",
      "decision log",
      "portfolio dashboard"
    ],
    "performanceMeasures": [
      "objective clarity",
      "strategic alignment",
      "benefits realized",
      "risk exposure"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_TITAN": {
    "reportsThrough": [
      "Shylow Thompson",
      "Strategic Command"
    ],
    "serves": [
      "@BARBARA",
      "@MAPE"
    ],
    "approvedToolClasses": [
      "executive dashboard",
      "decision register",
      "risk register"
    ],
    "performanceMeasures": [
      "decision latency",
      "control compliance",
      "portfolio health",
      "benefits realized"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_OMEGA": {
    "reportsThrough": [
      "@ARCHITECT",
      "mission owner"
    ],
    "serves": [
      "@ATLAS",
      "domain agents"
    ],
    "approvedToolClasses": [
      "model registry",
      "evaluation suite",
      "prompt registry",
      "telemetry"
    ],
    "performanceMeasures": [
      "reasoning quality",
      "grounding rate",
      "failure rate",
      "evaluation pass rate"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@ATLAS": {
    "reportsThrough": [
      "CARC authorization",
      "@MAPE"
    ],
    "serves": [
      "domain execution owner",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "mission registry",
      "workflow engine",
      "dependency register",
      "telemetry"
    ],
    "performanceMeasures": [
      "authorized completion",
      "cycle time",
      "handoff acceptance",
      "exception rate"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_SIGMA": {
    "reportsThrough": [
      "CARC authorization",
      "@MAPE"
    ],
    "serves": [
      "domain execution owner",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "mission registry",
      "workflow engine",
      "dependency register",
      "telemetry"
    ],
    "performanceMeasures": [
      "authorized completion",
      "cycle time",
      "handoff acceptance",
      "exception rate"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@HELIX": {
    "reportsThrough": [
      "@TANGO",
      "evidence registry"
    ],
    "serves": [
      "CARC verification decision"
    ],
    "approvedToolClasses": [
      "evidence repository",
      "test reports",
      "audit log",
      "signature verifier"
    ],
    "performanceMeasures": [
      "independent coverage",
      "defect escape rate",
      "evidence sufficiency",
      "verification latency"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@ARCHITECT",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@ATHENA": {
    "reportsThrough": [
      "authoritative sources",
      "decision records"
    ],
    "serves": [
      "entire team"
    ],
    "approvedToolClasses": [
      "knowledge base",
      "doctrine registry",
      "source manifest",
      "version history"
    ],
    "performanceMeasures": [
      "source coverage",
      "doctrine currency",
      "retrieval accuracy",
      "lineage completeness"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_YANKEE": {
    "reportsThrough": [
      "@MAPE",
      "@ATHENA"
    ],
    "serves": [
      "learners",
      "assessors"
    ],
    "approvedToolClasses": [
      "LMS",
      "curriculum registry",
      "assessment bank",
      "credential register"
    ],
    "performanceMeasures": [
      "completion rate",
      "assessment pass rate",
      "competency evidence",
      "credential integrity"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_BRAVO": {
    "reportsThrough": [
      "seller/market source",
      "CARC-authorized mission"
    ],
    "serves": [
      "@ATLAS",
      "@LEDGERMIND",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "Dynasty Property OS",
      "CRM",
      "deal analyzer",
      "document vault"
    ],
    "performanceMeasures": [
      "qualified leads",
      "deal margin",
      "cycle time",
      "realized profit"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_CHARLIE": {
    "reportsThrough": [
      "seller/market source",
      "CARC-authorized mission"
    ],
    "serves": [
      "@ATLAS",
      "@LEDGERMIND",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "Dynasty Property OS",
      "CRM",
      "deal analyzer",
      "document vault"
    ],
    "performanceMeasures": [
      "qualified leads",
      "deal margin",
      "cycle time",
      "realized profit"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_DELTA": {
    "reportsThrough": [
      "seller/market source",
      "CARC-authorized mission"
    ],
    "serves": [
      "@ATLAS",
      "@LEDGERMIND",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "Dynasty Property OS",
      "CRM",
      "deal analyzer",
      "document vault"
    ],
    "performanceMeasures": [
      "qualified leads",
      "deal margin",
      "cycle time",
      "realized profit"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_ECHO": {
    "reportsThrough": [
      "seller/market source",
      "CARC-authorized mission"
    ],
    "serves": [
      "@ATLAS",
      "@LEDGERMIND",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "Dynasty Property OS",
      "CRM",
      "deal analyzer",
      "document vault"
    ],
    "performanceMeasures": [
      "qualified leads",
      "deal margin",
      "cycle time",
      "realized profit"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_FOXTROT": {
    "reportsThrough": [
      "seller/market source",
      "CARC-authorized mission"
    ],
    "serves": [
      "@ATLAS",
      "@LEDGERMIND",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "Dynasty Property OS",
      "CRM",
      "deal analyzer",
      "document vault"
    ],
    "performanceMeasures": [
      "qualified leads",
      "deal margin",
      "cycle time",
      "realized profit"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_GOLF": {
    "reportsThrough": [
      "seller/market source",
      "CARC-authorized mission"
    ],
    "serves": [
      "@ATLAS",
      "@LEDGERMIND",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "Dynasty Property OS",
      "CRM",
      "deal analyzer",
      "document vault"
    ],
    "performanceMeasures": [
      "qualified leads",
      "deal margin",
      "cycle time",
      "realized profit"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_HOTEL": {
    "reportsThrough": [
      "seller/market source",
      "CARC-authorized mission"
    ],
    "serves": [
      "@ATLAS",
      "@LEDGERMIND",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "Dynasty Property OS",
      "CRM",
      "deal analyzer",
      "document vault"
    ],
    "performanceMeasures": [
      "qualified leads",
      "deal margin",
      "cycle time",
      "realized profit"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_INDIA": {
    "reportsThrough": [
      "seller/market source",
      "CARC-authorized mission"
    ],
    "serves": [
      "@ATLAS",
      "@LEDGERMIND",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "Dynasty Property OS",
      "CRM",
      "deal analyzer",
      "document vault"
    ],
    "performanceMeasures": [
      "qualified leads",
      "deal margin",
      "cycle time",
      "realized profit"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_KILO": {
    "reportsThrough": [
      "@MAPE",
      "deal owner"
    ],
    "serves": [
      "@LEDGERMIND",
      "@SALLY"
    ],
    "approvedToolClasses": [
      "capital stack model",
      "lender/investor registry",
      "funding tracker",
      "document vault"
    ],
    "performanceMeasures": [
      "capital readiness",
      "cost of capital",
      "funding gap",
      "closing certainty"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_JULIET": {
    "reportsThrough": [
      "@MAPE",
      "deal owner"
    ],
    "serves": [
      "@LEDGERMIND",
      "@SALLY"
    ],
    "approvedToolClasses": [
      "capital stack model",
      "lender/investor registry",
      "funding tracker",
      "document vault"
    ],
    "performanceMeasures": [
      "capital readiness",
      "cost of capital",
      "funding gap",
      "closing certainty"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_MIKE": {
    "reportsThrough": [
      "mission owner",
      "authoritative regulation"
    ],
    "serves": [
      "@BARBARA",
      "@ATLAS"
    ],
    "approvedToolClasses": [
      "obligation register",
      "contract repository",
      "compliance checklist",
      "issue log"
    ],
    "performanceMeasures": [
      "open obligations",
      "review cycle",
      "exception rate",
      "remediation closure"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_LIMA": {
    "reportsThrough": [
      "transaction sources",
      "@LEDGERMIND"
    ],
    "serves": [
      "@MAPE",
      "Dynasty OS"
    ],
    "approvedToolClasses": [
      "ledger",
      "reconciliation engine",
      "budget",
      "audit trail"
    ],
    "performanceMeasures": [
      "reconciliation accuracy",
      "cash variance",
      "realized profit",
      "close timeliness"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@ARCHITECT": {
    "reportsThrough": [
      "@ARCHITECT",
      "approved requirements"
    ],
    "serves": [
      "engineering",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "Git",
      "CI",
      "architecture registry",
      "observability"
    ],
    "performanceMeasures": [
      "deployment success",
      "change failure rate",
      "defect rate",
      "recovery time"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_ROMEO": {
    "reportsThrough": [
      "@ARCHITECT",
      "approved requirements"
    ],
    "serves": [
      "engineering",
      "@TANGO"
    ],
    "approvedToolClasses": [
      "Git",
      "CI",
      "architecture registry",
      "observability"
    ],
    "performanceMeasures": [
      "deployment success",
      "change failure rate",
      "defect rate",
      "recovery time"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_QUEBEC": {
    "reportsThrough": [
      "authoritative producers",
      "@CINA"
    ],
    "serves": [
      "approved consumers"
    ],
    "approvedToolClasses": [
      "schema registry",
      "database",
      "data-quality tests",
      "lineage catalog"
    ],
    "performanceMeasures": [
      "contract compliance",
      "data quality",
      "lineage coverage",
      "query reliability"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_OSCAR": {
    "reportsThrough": [
      "approved process",
      "@ARCHITECT"
    ],
    "serves": [
      "workflow consumers"
    ],
    "approvedToolClasses": [
      "n8n",
      "queue",
      "secrets manager",
      "telemetry"
    ],
    "performanceMeasures": [
      "automation success",
      "retry recovery",
      "manual hours saved",
      "exception rate"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_SIERRA": {
    "reportsThrough": [
      "telemetry",
      "asset registry"
    ],
    "serves": [
      "@ARCHITECT",
      "incident owner"
    ],
    "approvedToolClasses": [
      "security scanner",
      "SIEM",
      "access registry",
      "incident log"
    ],
    "performanceMeasures": [
      "detection time",
      "containment time",
      "critical findings",
      "control coverage"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_PAPA": {
    "reportsThrough": [
      "runtime systems"
    ],
    "serves": [
      "@MAPE",
      "@BARBARA",
      "@HELIX"
    ],
    "approvedToolClasses": [
      "event store",
      "dashboards",
      "query engine",
      "data-quality monitor"
    ],
    "performanceMeasures": [
      "telemetry completeness",
      "data freshness",
      "metric accuracy",
      "alert precision"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_NOVEMBER": {
    "reportsThrough": [
      "approved smart-contract mission"
    ],
    "serves": [
      "@ARCHITECT",
      "@LEDGERMIND"
    ],
    "approvedToolClasses": [
      "wallet",
      "chain explorer",
      "contract tests",
      "key custody"
    ],
    "performanceMeasures": [
      "transaction integrity",
      "contract-test pass rate",
      "gas/cost variance",
      "security findings"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_WHISKEY": {
    "reportsThrough": [
      "brand authority",
      "market intelligence"
    ],
    "serves": [
      "creative and growth teams"
    ],
    "approvedToolClasses": [
      "brand kit",
      "asset library",
      "approval workflow",
      "social listening"
    ],
    "performanceMeasures": [
      "brand compliance",
      "message consistency",
      "audience recall",
      "approval cycle"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_VICTOR": {
    "reportsThrough": [
      "strategic objective",
      "market intelligence"
    ],
    "serves": [
      "sales and channel teams"
    ],
    "approvedToolClasses": [
      "CRM",
      "analytics",
      "experiment registry",
      "campaign manager"
    ],
    "performanceMeasures": [
      "qualified demand",
      "conversion lift",
      "CAC",
      "attributed revenue"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_UNIFORM": {
    "reportsThrough": [
      "product owner",
      "customer demand"
    ],
    "serves": [
      "finance",
      "support",
      "logistics"
    ],
    "approvedToolClasses": [
      "commerce platform",
      "catalog",
      "order system",
      "analytics"
    ],
    "performanceMeasures": [
      "conversion rate",
      "order accuracy",
      "gross margin",
      "customer retention"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@NOVA": {
    "reportsThrough": [
      "approved brief",
      "brand authority"
    ],
    "serves": [
      "media and channel owners"
    ],
    "approvedToolClasses": [
      "creative suite",
      "asset library",
      "brief registry",
      "approval queue"
    ],
    "performanceMeasures": [
      "brief acceptance",
      "revision rate",
      "asset reuse",
      "performance contribution"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_XRAY": {
    "reportsThrough": [
      "creative brief",
      "approved assets"
    ],
    "serves": [
      "distribution owner"
    ],
    "approvedToolClasses": [
      "production suite",
      "media library",
      "publishing calendar",
      "analytics"
    ],
    "performanceMeasures": [
      "on-time delivery",
      "quality acceptance",
      "production cost",
      "content performance"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_TANGO": {
    "reportsThrough": [
      "approved order/mission"
    ],
    "serves": [
      "recipient",
      "finance"
    ],
    "approvedToolClasses": [
      "shipment tracker",
      "carrier portals",
      "inventory",
      "exception log"
    ],
    "performanceMeasures": [
      "on-time delivery",
      "cost per shipment",
      "damage rate",
      "exception closure"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@ORION": {
    "reportsThrough": [
      "strategic questions",
      "authoritative sources"
    ],
    "serves": [
      "@TROOPER_ALPHA",
      "@MAPE",
      "mission owner"
    ],
    "approvedToolClasses": [
      "research workspace",
      "source registry",
      "mapping tools",
      "opportunity log"
    ],
    "performanceMeasures": [
      "source quality",
      "opportunity validity",
      "decision usefulness",
      "freshness"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_ZULU": {
    "reportsThrough": [
      "strategic questions",
      "authoritative sources"
    ],
    "serves": [
      "@TROOPER_ALPHA",
      "@MAPE",
      "mission owner"
    ],
    "approvedToolClasses": [
      "research workspace",
      "source registry",
      "mapping tools",
      "opportunity log"
    ],
    "performanceMeasures": [
      "source quality",
      "opportunity validity",
      "decision usefulness",
      "freshness"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  },
  "@TROOPER_PHOENIX": {
    "reportsThrough": [
      "risk register",
      "innovation backlog"
    ],
    "serves": [
      "@ARCHITECT",
      "@MAPE"
    ],
    "approvedToolClasses": [
      "experiment registry",
      "continuity plan",
      "test environment",
      "lessons log"
    ],
    "performanceMeasures": [
      "experiment learning",
      "recovery readiness",
      "innovation yield",
      "risk reduction"
    ],
    "handoffProtocol": [
      "identify target canonical ID",
      "attach scope, state, evidence and dependencies",
      "request ACK and ACCEPTED",
      "retain ownership until acceptance",
      "record transfer and unresolved risks"
    ],
    "escalationTriggers": [
      "missing or conflicting authority",
      "ambiguous canonical reference",
      "permission or source failure",
      "cross-domain ownership conflict",
      "unsafe instruction",
      "missing required evidence",
      "deadline or economic threshold breach"
    ],
    "prohibitedActions": [
      "self-authorize execution",
      "exceed delegated domain authority",
      "silently change canonical identity or source truth",
      "erase or overwrite lineage",
      "report projection as realized outcome",
      "self-verify execution",
      "claim PRODUCTION_VERIFIED without runtime evidence"
    ],
    "completionContract": [
      "outcome",
      "evidence references",
      "residual risk",
      "next action",
      "action owner",
      "mission status",
      "verification state"
    ],
    "reviewOwner": "@BARBARA",
    "verifier": "@HELIX",
    "readinessState": "READINESS_UNKNOWN",
    "sourceClassification": "ROLE_DERIVED_WORKING"
  }
});
