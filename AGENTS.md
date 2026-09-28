# AGENTS.md

## Code style and conventions

- TypeScript strict; avoid `any` (use precise types). Comments in English. Keep solutions simple and maintainable.

## Team preferences

- Prefer simple, easy-to-maintain solutions.
- Avoid using the `any` type in TypeScript.
- Write code comments in English.

## Context7 (up-to-date docs)

- Use Context7 to fetch current library docs before using APIs prone to change.
- Workflow:
  1. Resolve a library ID: resolve the library (e.g., React Native, Vite, TanStack Query).
  2. Fetch docs scoped to the topic (e.g., hooks, routing).
  3. Integrate code examples following our style rules.

## Sequential Thinking (step-by-step problem solving)

- Break work into small thought steps:
  1. Define immediate goal/assumption.
  2. Use suitable tool (search, code edit, error explainer, docs).
  3. Record the output/results.
  4. Decide next step or branch alternatives; compare trade-offs.
- Encourage rollback/iteration if new information contradicts prior steps.

## Quick checklists

- Implementation
  - [ ] Type-safe (no `any`), readable names, English comments where needed.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
