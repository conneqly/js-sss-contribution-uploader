# CSV Result Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a downloadable CSV export for the line-by-line portal results.

**Architecture:** Reuse the script's existing result rows as the source of truth. Add a small CSV serializer and a new export button in the floating panel, while keeping the current JSON export intact.

**Tech Stack:** Tampermonkey userscript, vanilla JavaScript, browser Blob download APIs.

## Global Constraints

- Keep the current status and summary UI unchanged.
- The CSV export must include the line-by-line result rows.
- Preserve the existing JSON export behavior.
- Use ASCII-only file contents.

---

### Task 1: Add CSV export UI and serializer

**Files:**
- Modify: `src/sss-contribution-uploader.user.js`

**Interfaces:**
- Consumes: `state.lastReport`, `state.reportRows`, `ui.downloadJson`, `ui.copyReport`
- Produces: `downloadReportCsv()` and a new `ui.downloadCsv` control

- [ ] **Step 1: Add the failing export wiring**

Add a `Download CSV` button next to the existing export controls and wire it to a new handler.

- [ ] **Step 2: Implement the CSV serializer**

Create a helper that serializes rows with headers `rowNumber,Name,EmpCode,SSS,Amount,status,detail` and escapes commas, quotes, and newlines.

- [ ] **Step 3: Verify the script still parses**

Run: `node --check src/sss-contribution-uploader.user.js`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/sss-contribution-uploader.user.js docs/superpowers/plans/2026-08-25-csv-result-export.md
git commit -m "feat: add CSV export for results"
```
