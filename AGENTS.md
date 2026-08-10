# Repository instructions

@/Users/fu050409/.codex/RTK.md

## Source of truth

- `docs/DESIGN.md` is the authoritative and complete description of the current
  workspace architecture, interaction design, constraints, priorities, and
  acceptance criteria.
- Before developing any request, read `docs/DESIGN.md` and verify that it still
  reflects the user's current request.
- If requirements or technical decisions change, update `docs/DESIGN.md`
  first, then regenerate or reorder the unimplemented work in root `TODO.md`,
  and only then implement code.
- `TODO.md` is a derived list of work that has not landed. It must never
  override `docs/DESIGN.md`.
- When existing code, comments, historical conventions, or `TODO.md` conflict
  with `docs/DESIGN.md`, follow `docs/DESIGN.md` unless the user explicitly
  changes the requirement in the current conversation.

## Implementation gate

- Do not modify source code, styles, dependencies, build configuration, quality
  configuration, generated components, or lockfiles until the user explicitly
  asks to begin implementation or to modify code.
- Until that authorization is given, only inspection and maintenance of
  planning/instruction documentation are allowed.
- Existing violations are migration tasks. Do not opportunistically fix them
  while doing documentation or investigation work.

## Required frontend conventions

- Build the frontend with shadcn/ui using Luma style and Base UI
  (`@base-ui/react`) primitives.
- Preserve the current light and dark OKLCH color tokens and overall color
  palette exactly unless the user explicitly approves a palette change.
- Use Tailwind CSS for component and page styling. Keep global CSS limited to
  Tailwind imports, design tokens, base reset, and unavoidable global rules.
- Keep the shadcn/ui-compatible layout and aliases, including reusable
  primitives under `src/components/ui/` and utilities under `src/lib/`.
- shadcn/ui does not prescribe `app/`, `features/`, or `services/` layers. Do
  not introduce those top-level directories solely as an architectural pattern;
  preserve the Farm SPA entry points and pages, place composed business UI
  under `src/components/`, and place API clients and pure utilities under
  `src/lib/`.
- Every code filename must use kebab-case. Use kebab-case for code directories
  as well. Component and type identifiers inside code may use PascalCase.
- Use Zustand for shared, asynchronous, or persistent client data. Put domain
  models, stores, actions, selectors, schemas, and associated types under
  `src/models/`.
- Do not keep duplicated state that can be derived by selectors.
- Keep pages in a first-screen design: keep content height as small as possible
  and avoid requiring users to scroll vertically.

## Formatting and review

- Use Biome.js for formatting, linting, and import organization.
- JavaScript, TypeScript, JSX, and TSX use single quotes.
- Indent with spaces, never tabs, at 2 spaces per level.
- Biome must review checked-in shadcn/ui code as well as application code.
- Prefer read-only `biome check` during validation. Do not run write/fix mode
  outside the explicitly authorized change scope.
- CI checks must not auto-fix and push commits to the user's branch.

## Completion discipline

- Follow the priority order in `docs/DESIGN.md` and root `TODO.md`.
- A task is complete only after relevant type checks, Biome checks, tests, and
  builds pass, and after `docs/DESIGN.md` and `TODO.md` are synchronized with
  the resulting implementation.
