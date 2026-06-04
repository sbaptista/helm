# Resolve Lint Failures and Restore Build Safety in Helm

Provide a structured plan to restore `npm run lint` as a reliable signal, establish build safety, and incrementally clean up React hook rendering issues in the Helm codebase.

## Codebase Status & Triage

1. **Next Build Success**: Direct compilation via `npm run build` (`next build`) compiles successfully. The built-in Next.js build pipeline does not treat the strict custom rules as fatal blockers.
2. **Error Count Breakdown**: Although scanning the root directory initially reported 673 errors, **only 45 errors and 16 warnings** exist in the active codebase source directories (`app/`, `components/`, `lib/`, `hooks/`). The remaining errors are duplicates from cached builds in `.next/` and worktrees in `.claude/`.
3. **Source Code Breakdown (45 Errors, 16 Warnings)**:
   * `@typescript-eslint/no-explicit-any`: 34 errors across 6 files (primarily printing, confirmation API, and GCal integration).
   * `react-hooks/set-state-in-effect`: 11 errors across 5 files (UI banner, ResponsiveSheet, fatal error page, and media query hooks).
   * Warnings (16 total): `@typescript-eslint/no-unused-vars` (8), `react-hooks/exhaustive-deps` (4), `syntax-error` (3), `@typescript-eslint/no-unused-expressions` (1).

## User Review Required

> [!IMPORTANT]
> **ESLint Worktree Pollution**: Running `eslint` in the workspace root currently processes files inside the `.claude/` directory (where Claude Code isolates worktrees), polluting local reports. We must explicitly ignore `.claude/` in [eslint.config.mjs](file:///Users/stanleybaptista/Projects/helm/eslint.config.mjs).
> 
> **Zero New Errors Policy**: Once Phase 1 is executed, the codebase will have 0 errors and a controlled set of warnings. Any commit that introduces a new *error* will fail the lint check.

## Proposed Timeline & Phases

### Phase 1: Establish Baseline Safety (Immediate)

This phase should ship alone immediately. It cleans the reports and configures warning overrides to restore `npm run lint` as a useful signal.

#### 1. Step 0: Mechanical Fix Pass
* Run `npx eslint --fix` to automatically clean up simple warnings (e.g., `prefer-const`).

#### 2. Ignore Worktrees in ESLint Config
Add `.claude/` to `globalIgnores` inside [eslint.config.mjs](file:///Users/stanleybaptista/Projects/helm/eslint.config.mjs) to prevent duplicate worktree files from polluting local reports.

#### 3. Adjust ESLint Rules
Temporarily relax the following rules to `"warn"` inside [eslint.config.mjs](file:///Users/stanleybaptista/Projects/helm/eslint.config.mjs) to turn the 45 fatal errors into warnings:
* `@typescript-eslint/no-explicit-any`
* `react-hooks/set-state-in-effect`

---

### Phase 2: Resolving React Hook Side-Effects (Backlog)

Address the 11 `set-state-in-effect` errors in high-traffic UI components.

* **`useMediaQuery.ts` & `ResponsiveSheet.tsx`**: Replace manual effect-driven media queries with React 18+'s `useSyncExternalStore` (via a library hook or standard implementation) to retrieve media matching state synchronously without triggering cascading renders.
* **`HelmVersionLabel.tsx`**: Defer mounting logic safely to compute standard client-side labels without cascading triggers.
* **`UpdateBanner.tsx`**: Extract visibility hooks or schedule checks cleanly.

---

### Phase 3: Incremental Type Safety & Hygiene (Backlog)

* **Triage GCal Integration & Printing**: Resolve the 34 `no-explicit-any` violations in the key calendar synchronization and printing components by declaring typed interfaces.
* **Eslint-disable / ts-expect-error Audit**: Audit all existing inline suppressions in the project to ensure they are documented and not masking hidden bugs.

## Verification Plan

### Automated Tests
- Run `npx eslint app components lib hooks` and verify it exits with `0` (warnings only).
- Run `npm run build` and ensure Turbopack compilation remains green.
