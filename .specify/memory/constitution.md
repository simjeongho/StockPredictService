<!--
SYNC IMPACT REPORT
==================
Version change: [INITIAL] → 1.0.0
Added sections:
  - Core Principles (I–V)
  - Data & Privacy Requirements
  - Development Workflow
  - Governance
Modified principles: N/A (initial ratification)
Removed sections: N/A

Templates reviewed:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check section present)
  - .specify/templates/spec-template.md ✅ aligned (user-story driven, success criteria required)
  - .specify/templates/tasks-template.md ✅ aligned (phased delivery, independent testability)

Deferred items: None
-->

# 주가 예측 웹 애플리케이션 Constitution

## Core Principles

### I. Data Integrity First

All predictions and analyses MUST be derived exclusively from verified, validated source data.
Raw data MUST pass quality checks (completeness, freshness, consistency) before being used
in any prediction or display. Features that depend on external market data MUST degrade
gracefully when that data is unavailable or stale — never silently present outdated values
as current.

**Rationale**: Incorrect or stale financial data can mislead users into poor decisions.
Data trust is the foundation every other principle depends on.

### II. Prediction Transparency

Predictions MUST be accompanied by confidence levels, time horizons, and the assumptions
underlying them. The system MUST NOT present any forecast as a certainty. Every prediction
view MUST include a visible disclaimer that forecasts are probabilistic and not financial
advice. Users MUST be able to understand what drove a prediction (key input factors) without
needing domain expertise.

**Rationale**: Financial misinformation carries real-world harm. Transparency protects users
and is a non-negotiable ethical requirement for this domain.

### III. User Accessibility

Complex financial and statistical concepts MUST be translated into plain language visible
to non-expert users. Technical metrics (e.g., volatility, RMSE, confidence intervals) MUST
always appear alongside a human-readable explanation. The primary user interface MUST be
navigable and useful without requiring any financial background. Expert-level detail MAY be
available behind progressive disclosure (e.g., expandable sections) but MUST NOT block
the primary flow.

**Rationale**: The application targets general consumers, not professional traders. Excluding
non-experts from core value defeats the product's purpose.

### IV. Incremental Value Delivery

Every feature MUST be designed as an independently testable and deployable slice that
delivers standalone user value. A slice is considered complete only when it can be
demonstrated to a user without requiring any unimplemented future slice. Planning and task
breakdown MUST follow the slice-first model: foundational infrastructure → user story 1
(MVP) → additional stories in priority order. Partial implementations that do not deliver
end-to-end value MUST NOT be shipped.

**Rationale**: Delivering usable functionality early reduces risk, enables user feedback,
and prevents large-batch releases that are hard to debug or roll back.

### V. Simplicity & Maintainability

The simplest solution that satisfies a requirement MUST be chosen over a more complex one.
Speculative abstractions, premature optimizations, and features built for hypothetical
future needs are prohibited. Every added dependency MUST be justified by a concrete current
requirement. Complexity that cannot be explained in one sentence MUST be challenged and
documented in the Complexity Tracking section of the implementation plan.

**Rationale**: Unnecessary complexity accumulates technical debt, slows iteration, and
increases the risk of prediction errors caused by hard-to-trace bugs.

## Data & Privacy Requirements

- All market/financial data displayed to users MUST carry a visible timestamp indicating
  when it was last updated.
- User-specific data (watchlists, portfolios, search history) MUST be stored only for the
  purpose of providing the service and MUST NOT be sold or shared with third parties.
- The system MUST comply with applicable data protection regulations for the target region
  (e.g., GDPR for EU users, relevant local regulations for Korean users).
- Prediction models and their training data lineage MUST be documented so that outputs can
  be audited and reproduced.
- Users MUST be able to delete their personal data on request.

## Development Workflow

- Every feature begins with a specification (`/speckit.specify`) before any implementation
  work starts. No code is written against an unspecified requirement.
- Planning (`/speckit.plan`) MUST include a Constitution Check gate that verifies the
  proposed design does not violate any principle above.
- Task breakdown (`/speckit.tasks`) MUST map each task to a specific user story, enabling
  independent delivery of each story.
- All features are considered complete only when acceptance scenarios defined in the spec
  pass end-to-end.
- Breaking changes to prediction models or data schemas MUST be versioned and announced
  to users before deployment.

## Governance

This constitution supersedes all other project guidance documents in cases of conflict.
Amendments require:
1. A documented rationale explaining why the change is necessary.
2. A review of all affected templates and downstream artifacts.
3. A version bump following semantic versioning rules (see below).
4. Update of `LAST_AMENDED_DATE` in the version line.

**Versioning policy**:
- MAJOR bump: Removal or redefinition of a core principle that breaks existing feature
  contracts.
- MINOR bump: Addition of a new principle, section, or materially expanded guidance.
- PATCH bump: Clarifications, wording improvements, typo fixes.

All implementation plans and specs MUST re-verify compliance with this constitution
whenever a MAJOR or MINOR amendment is ratified.

**Version**: 1.0.0 | **Ratified**: 2026-04-15 | **Last Amended**: 2026-04-15
