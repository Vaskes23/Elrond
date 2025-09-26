# Code Cleanup and Documentation Plan

This document outlines the plan for cleaning up, documenting, and restructuring the `elrond-hs-codes` repository.

## 1. Repository Structure

The project is a standard Create React App application with the following structure:

```
/public
  - index.html
  - static assets (images, icons)
/src
  /components
    - React components that make up the UI
  /utils
    - Utility functions, API integrations
  - App.tsx (main app component)
  - index.tsx (app entry point)
  - types.ts (TypeScript type definitions)
  - mockData.ts (mock data for development)
```

## 2. TODO List

### Code Cleanup

-   [ ] **Remove unused code:**
    -   [ ] `Dashboard.tsx`: Remove `leftSidebarVisible` state and `toggleLeftSidebar` function.
    -   [ ] `Dashboard.tsx`: Remove unused `searchQuery` state.
    -   [ ] `MainPanel.tsx`: Remove the `calculateMetrics` function and its usage, as the metrics are not displayed.
-   [ ] **Refactor for consistency and clarity:**
    -   [ ] Centralize product filtering logic. The same filtering logic is present in both `Dashboard.tsx` and `RightSidebar.tsx`. I will create a new utility function for this.
    -   [ ] Move helper functions (`getStatusColor`, `getStatusLabel`, `formatDate`, `formatTime`, `getCategoryColor`) from `RightSidebar.tsx` and `MainPanel.tsx` to a new `src/utils/helpers.ts` file.
    -   [ ] Address `@ts-ignore` comments in the codebase.
    -   [ ] Make styling more consistent by moving inline styles to CSS files where appropriate.

### Documentation

-   [ ] **Add code comments:**
    -   [ ] Add comments to complex components like `MainPanel.tsx` and `RightSidebar.tsx` to explain their functionality.
    -   [ ] Add comments to the `claudeApi.ts` file to explain the purpose of the fallback functions.
-   [ ] **Update `AGENTS.md`:**
    -   [ ] After the cleanup and documentation is complete, update the `AGENTS.md` file to reflect the changes.

### General

-   [ ] **API Key Handling:**
    -   [ ] The `claudeApi.ts` file has a hardcoded `undefined` API key. This needs to be properly handled using environment variables. I will add a note about this in the documentation.
