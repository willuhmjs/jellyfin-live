# Frontend Technical Audit Report: Jellyfin-Live

**Date:** 2026-01-18
**Auditor:** Roo
**Scope:** Frontend Architecture, UI Components, Styling, and Accessibility

## 1. Executive Summary

The project utilizes SvelteKit with Tailwind CSS. It is currently in a transitional state between Svelte 4 and Svelte 5 (Runes), leading to mixed syntax patterns. The styling architecture also shows signs of a transition between Tailwind v3 and v4. While the core functionality seems robust, there are significant opportunities to standardize the codebase, improve accessibility, and optimize for the latest Svelte features.

## 2. Issues

### High Severity

*   **Inconsistent Reactivity Models**: The codebase mixes Svelte 5 Runes (`$props()`, `$state`) with legacy Svelte 4 reactivity (`export let`, `$:`).
    *   *Location*: `src/routes/dashboard/+page.svelte` uses `$:` for derived state but is likely intended to be updated to Svelte 5. `src/routes/+layout.svelte` uses Runes.
    *   *Impact*: Confusion for developers, potential bugs due to differing reactivity behaviors, and technical debt.
*   **Tailwind Configuration Conflict**: The project uses both Tailwind v4 CSS-based configuration (`@theme` in `src/app.css`) and a legacy `tailwind.config.js`.
    *   *Location*: `src/app.css` vs `tailwind.config.js`.
    *   *Impact*: Conflicting or ignored theme settings, build complexity, and maintenance confusion.
*   **Accessibility Violations in Interactive Elements**: Key interactive elements rely on `click` events without corresponding keyboard handlers.
    *   *Location*: `src/lib/components/GuideGrid.svelte` (Line 58: `svelte-ignore a11y-click-events-have-key-events`).
    *   *Impact*: The application is inaccessible to keyboard users and those using assistive technologies.

### Medium Severity

*   **Waterfall Data Fetching in Modals**: `ProgramModal` fetches its own detailed data on mount (`fetch` inside `onMount`).
    *   *Location*: `src/lib/components/ProgramModal.svelte`.
    *   *Impact*: Slower perceived performance, "pop-in" of content, and lack of server-side rendering benefits for that content.
*   **Deprecated Store Usage**: Usage of the `$page` store (SvelteKit v1/early v2) instead of the new global `page` state object.
    *   *Location*: `src/lib/components/Navbar.svelte`.
    *   *Impact*: Future compatibility issues as SvelteKit evolves.
*   **Legacy Event Dispatching**: Use of `createEventDispatcher` instead of callback props (Svelte 5 best practice).
    *   *Location*: `src/lib/components/GuideGrid.svelte`, `src/lib/components/ProgramModal.svelte`.
    *   *Impact*: Adds boilerplate and deviates from the simpler function-prop pattern in Svelte 5.

### Low Severity

*   **Hardcoded Values & Magic Numbers**: Layout calculations in the Grid use hardcoded pixel values.
    *   *Location*: `src/lib/components/GuideGrid.svelte` (`PIXELS_PER_MINUTE = 4`).
    *   *Impact*: Difficult to maintain responsive designs or change zooming levels.
*   **Large Page Component**: `src/routes/dashboard/+page.svelte` is becoming a "God Component," handling search, hero banners, lists, and scheduling logic.
    *   *Impact*: Hard to test and maintain.
*   **Virtual List Dependency**: Reliance on `svelte-virtual-list` which may not be fully optimized for Svelte 5.

## 3. Recommendations

### Architecture & Code Quality
1.  **Standardize on Svelte 5 Runes**:
    *   Refactor all `export let` to `let { ... } = $props()`.
    *   Replace `$:` with `$derived()` or `$effect()`.
    *   Replace `createEventDispatcher` with callback props (e.g., `onSelect: (item) => void`).
2.  **Unify Tailwind Configuration**:
    *   Decide on Tailwind v4 (CSS-first) or v3 (JS-config). Given `src/app.css` uses `@theme`, migrating fully to v4 and removing `tailwind.config.js` (or minimizing it) is recommended.

### UX & UI Improvements
3.  **Refactor Dashboard Page**:
    *   Extract logical sections of `src/routes/dashboard/+page.svelte` into smaller components:
        *   `DashboardSearch.svelte`
        *   `HeroBanner.svelte`
        *   `PremieresList.svelte`
        *   `ScheduledRecordings.svelte`
4.  **Improve Data Loading**:
    *   For `ProgramModal`, consider pre-loading basic data or using a SvelteKit API route that returns a streamed response to handle the loading state more gracefully at the page level if possible, or keep the fetch but use `await` blocks in the template for better readability than `if (loading)`.

### Accessibility (A11y)
5.  **Fix Keyboard Navigation**:
    *   Ensure all `div`s acting as buttons in `GuideGrid` have `on:keydown` or `on:keypress` handlers.
    *   Better yet, replace `div role="button"` with actual `<button>` elements to get native keyboard support for free.

### Next Steps
1.  **Phase 1**: Fix High Severity issues (Tailwind config, key reactivity refactors).
2.  **Phase 2**: Accessibility audit and remediation.
3.  **Phase 3**: Component refactoring and extracting sub-components from Dashboard.
