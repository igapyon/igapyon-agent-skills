---
title: miku-soft developer rule ownership inventory
description: "Owners and callsite roles for the shared miku-soft developer skill references."
category: maintenance
status: stable
created: 2026-10-22
updated: 2026-10-22
---

# miku-soft developer rule ownership inventory

This inventory records which file owns each shared rule after the 2026-10-22
review. Entry points and workflows may retain short summaries needed to choose
or complete a task. Those summaries should point to the owner and must not
create a competing rule.

| Rule ID | Current explanation and heading | Content owner | Summary retained at callers | Exceptions to preserve | Status |
| --- | --- | --- | --- | --- | --- |
| ACT-01 | SKILL.md activation paragraph; references/activation-policy.md, Strict Activation and Work About This Skill | references/activation-policy.md | SKILL.md retains the explicit trigger, bare-call behavior, continuation rule, and meta-work route | Separate authorization can permit an otherwise non-activating task; a bare call still does not authorize edits | Entry summary retained |
| MODE-01 | SKILL.md Modes and Core Workflow | SKILL.md | Each workflow owns its task-specific inputs and execution order | Concept discussion does not create files; review-only does not mutate | Router owns selection |
| REF-01 | references/architecture-rules.md, Basic Document Selection and Applying References | references/architecture-rules.md | Workflows name the specific design documents needed for their layer | Read only task-relevant basics; existing repository contracts bound shared defaults | Selector retained |
| ARCH-01 | references/miku-soft-basic/miku-soft-00-overview-design.md and each layer basic document | Each applicable miku-soft-basic layer document owns detailed semantics and layer boundaries; overview owns cross-layer relationships | architecture-rules.md gives a one-sentence invariant and links the detail | Overview may summarize responsibility boundaries; it must not replace layer-specific rules | Overview document list consolidated into selector |
| REPO-01 | references/repo-operations.md, miku-soft Additions | references/repo-operations.md owns miku-specific GitHub and repository-operation boundaries | Workflows retain only the human action or local file step that matters in that procedure | Local workflow preparation is allowed; remote GitHub publication remains human-owned | Task-specific reminders retained |
| L10 | references/miku-soft-basic/miku-soft-10-mainapp-design.md | Layer 10 basic document | 10-node-app-workflow.md owns sequence and checks | Existing product contracts and compatibility ranges | Owner confirmed |
| L11 | references/miku-soft-basic/miku-soft-11-web-design.md | Layer 11 basic document | 11-web-app-workflow.md owns sequence and checks | Browser behavior and Web-only publication settings | Owner confirmed |
| L20-21 | references/miku-soft-basic/miku-soft-20-javaapp-design.md and miku-soft-21-java-maven-design.md | Matching Java basic document | Java workflows own conversion and separation steps | Maven plugin remains optional unless requested or already in scope | Owner confirmed |
| CONV-30 | references/miku-soft-basic/miku-soft-30-straight-conversion.md | Straight-conversion basic document | 30-java-straight-conversion-workflow.md owns execution order | Java-specific extensions remain separate from upstream parity | Method is not a product layer |
| L40 | references/miku-soft-basic/miku-soft-40-agentskills-design.md | Agent Skills basic document owns detailed package/runtime policy and current starter version settings | 40-agent-skills-workflow.md owns the task sequence and starter usage | Approved D-NODE policy: oldest maintained LTS as the floor; verify the floor and newest LTS | Numeric snapshot and starter assets updated 2026-10-22; runtime execution remains unverified |
| L50 | references/miku-soft-basic/miku-soft-50-mcp-design.md | MCP basic document | 50-mcp-workflow.md owns task inputs and checklist | Protocol/client compatibility must not redefine upstream semantics | Owner confirmed |
| CLI-01 | references/miku-soft-ai-era-cli-interface.md | Shared CLI interface reference | Layer-specific references link to it and state only actual differences | Existing product CLI contract is not globally rewritten | Owner confirmed |
| META-01 | references/miku-soft-ai-era-markdown-front-matter.md | Shared front matter reference | Layer/product docs retain required fields and schema-specific exceptions | Product-specific reader schemas remain authoritative | Owner confirmed |
| UPLIFT-01 | docs/maintenance/adoption-workflow.md | Maintenance adoption workflow owns applicability and execution rules | maintenance-workflow.md routes to it | Pending audit proposals are not approved shared rules | Owner confirmed |
| HIST-01 | docs/maintenance dated audits and review reports | Each dated document owns its historical evidence | Current references link to a dated record only when decision status matters | Historical measurements are not current guarantees | Kept outside normative rules |
| NODE-01 | miku-soft-basic/miku-soft-40-agentskills-design.md, Node baseline section; package and workflow templates | The Node baseline section owns the compatibility rule and dated numeric snapshot; templates realize that snapshot | workflow prose explains version roles and points to the owner | Product minimum, CI versions, release host, artifact smoke, and Actions internal runtime are separate decisions | Policy approved 2026-10-22; current snapshot and starter metadata updated; runtime execution remains unverified |
| JAVA-01 | miku-soft-basic/miku-soft-20-javaapp-design.md, Java Compatibility Conventions | The Java application design owns the runtime floor, test endpoints, and build-JDK separation | 30-java-straight-conversion-workflow.md carries the task checklist and release-smoke guidance | JDK distribution support periods differ; repository-specific runtime exceptions must be documented | Policy approved 2026-10-22; design and workflow updated; Java 8/latest-LTS runtime execution remains unverified |

## Changes made during the 2026-10-22 implementation

- Java CLI applications now use Java 8 as the default runtime floor and verify
  Java 8 plus the newest LTS of the declared JDK distribution; build JDK
  selection remains separate.
- The overview no longer duplicates the full basic-document selector; it links to
  the selector in architecture-rules.md.
- The Agent Skills workflow refers to the Agent Skills design for numeric
  Node values and keeps task-specific package/CI/Actions responsibilities.
- Agent Skills starter smoke now extracts and checks the final release ZIP.
  Concrete ZIP corruption and the renamed ZIP are exercised by the integration
  fixture.
- Other retained summaries have separate routing or completion-check roles;
  they were not removed solely because they mention the same subject.
