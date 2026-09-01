# SSS Contribution Uploader — User Guide

This guide walks you through setting up and using the **SSS Contribution Uploader** from start to finish. No coding knowledge is required.

---

## Table of Contents

1. [What You Need Before Starting](#1-what-you-need-before-starting)
2. [Install Tampermonkey](#2-install-tampermonkey)
3. [Install the SSS Contribution Uploader Script](#3-install-the-sss-contribution-uploader-script)
4. [Prepare Your CSV File](#4-prepare-your-csv-file)
5. [Open the SSS Employer Portal](#5-open-the-sss-employer-portal)
6. [Load Your CSV File](#6-load-your-csv-file)
7. [Run a Dry Run (Recommended First Step)](#7-run-a-dry-run-recommended-first-step)
8. [Run a Live Update](#8-run-a-live-update)
9. [Download the Results](#9-download-the-results)
10. [Understanding the Results](#10-understanding-the-results)
11. [Stopping a Run](#11-stopping-a-run)
12. [Troubleshooting](#12-troubleshooting)
13. [Frequently Asked Questions](#13-frequently-asked-questions)

---

## 1. What You Need Before Starting

Before you begin, make sure you have:

- ✅ **Google Chrome** browser (updated to the latest version)
- ✅ An **SSS Employer Portal** account with login credentials
- ✅ A **CSV file** with your employees' SSS contribution data (see [Step 4](#4-prepare-your-csv-file))

---

## 2. Install Tampermonkey

Tampermonkey is a free Chrome extension that lets you run custom scripts on web pages. You only need to do this once.

### Steps

1. Open Google Chrome
2. Go to the Tampermonkey page on the Chrome Web Store:
   👉 [https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
3. Click the **"Add to Chrome"** button
4. A pop-up will ask for permission — click **"Add extension"**
5. You should see a small Tampermonkey icon (a black square with two dots) appear in your Chrome toolbar

> **💡 Tip:** If you don't see the icon, click the puzzle-piece icon (🧩) in the toolbar and pin Tampermonkey so it's always visible.

---

## 3. Install the SSS Contribution Uploader Script

Now you need to add the uploader script to Tampermonkey.

### Steps

1. Open the script file: [`sss-contribution-uploader.user.js`](../src/sss-contribution-uploader.user.js)
2. **Select all** the text in the file (press `Ctrl + A` on Windows or `Cmd + A` on Mac)
3. **Copy** it (press `Ctrl + C` or `Cmd + C`)
4. Click the **Tampermonkey icon** in your Chrome toolbar
5. Click **"Create a new script…"**
6. In the editor that opens, **select all** the existing template text and **delete** it
7. **Paste** the script you copied (press `Ctrl + V` or `Cmd + V`)
8. Press `Ctrl + S` (or `Cmd + S`) to **save** the script
9. You should see a confirmation that the script was saved

> **✅ Done!** The script is now installed. It will activate automatically whenever you visit the SSS Employer Portal dashboard.

### How to Verify It's Installed

1. Click the **Tampermonkey icon** in your toolbar
2. Click **"Dashboard"**
3. You should see **"SSS Contribution Uploader"** listed and **enabled** (the toggle switch should be ON)

---

## 4. Prepare Your CSV File

The uploader reads a standard CSV (comma-separated values) file. You can create this in **Microsoft Excel**, **Google Sheets**, or any spreadsheet program.

### Required Columns

Your file **must** have exactly these four column headers in the first row:

| Column | What to Put Here | Example |
|---|---|---|
| `Name` | Employee's full name | Juan Dela Cruz |
| `EmpCode` | Your company's employee ID | EMP001 |
| `SSS` | The employee's SSS member number | 34-1234567-8 |
| `Amount` | The contribution amount in pesos | 1500.00 |

### Example CSV

```
Name,EmpCode,SSS,Amount
Juan Dela Cruz,EMP001,34-1234567-8,1500.00
Maria Santos,EMP002,34-7654321-0,1800.00
Pedro Reyes,EMP003,34-9876543-2,1200.50
Ana Garcia,EMP004,,950.00
```

> **📝 Note:** In the example above, Ana Garcia has no SSS number. The tool will flag her row for **manual review** instead of trying to process it — nothing will break.

### How to Save as CSV

- **From Excel:** Go to File → Save As → choose **"CSV (Comma delimited) (*.csv)"**
- **From Google Sheets:** Go to File → Download → **"Comma Separated Values (.csv)"**

### Common Mistakes to Avoid

| ❌ Problem | ✅ Fix |
|---|---|
| Column headers are misspelled (e.g., `Amt` instead of `Amount`) | Use the exact column names: `Name`, `EmpCode`, `SSS`, `Amount` |
| File saved as `.xlsx` instead of `.csv` | Re-save as CSV format |
| Extra spaces in SSS numbers | The tool handles minor spacing, but keep them clean |
| Amount has peso sign (₱1,500) | Use plain numbers only: `1500` or `1500.00` |

---

## 5. Open the SSS Employer Portal

1. Go to the SSS Employer Portal: 👉 [https://employer.sss.gov.ph](https://employer.sss.gov.ph)
2. **Log in** with your employer account credentials
3. Navigate to the **Dashboard** page
4. Wait for the page to fully load

Once the dashboard is loaded, the **SSS Contribution Uploader** panel will automatically appear in the **upper-right corner** of the page.

### What the Panel Looks Like

You will see a dark floating panel with:

- A title: **"SSS Contribution Uploader"**
- A file input to load your CSV
- Three buttons: **Dry Run**, **Live Update**, and **Stop**
- A **Download CSV** button (for results)
- A status area and progress bar

> **⚠️ Don't see the panel?** See [Troubleshooting](#12-troubleshooting) below.

---

## 6. Load Your CSV File

1. In the uploader panel, click the **file input** (it says "Choose File" or "No file chosen")
2. Browse to your CSV file and select it
3. The panel will display a summary:

```
File: contributions-march-2026.csv
Rows: 45
Ready: 42
Manual review: 2
Needs attention: 1
Required columns: Name, EmpCode, SSS, Amount
```

### What the Summary Means

| Status | Meaning |
|---|---|
| **Ready** | These rows have all required data and are good to process |
| **Manual review** | These rows are missing an SSS number — you'll need to handle them yourself on the portal |
| **Needs attention** | These rows have problems (e.g., missing name, invalid amount) and will be skipped |

---

## 7. Run a Dry Run (Recommended First Step)

A **Dry Run** checks whether each employee's SSS number can be found in the portal. It **does not** change or save any data — it's completely safe to run.

### Steps

1. After loading your CSV, click the **"Dry Run"** button
2. The tool will go through each row one by one
3. The status area shows which row is being processed
4. The progress bar fills up as rows are completed

### What Happens During a Dry Run

For each row, the tool:

1. Selects "SSS Number" as the search method in the portal
2. Types the employee's SSS number into the search box
3. Clicks the search button
4. Checks if a matching member appears in the results
5. Reports **"Found"** or **"Manual review"** (not found)

> **💡 This is a safe test!** No contribution amounts are changed. Use this to verify your CSV data is correct before doing a Live Update.

---

## 8. Run a Live Update

A **Live Update** does everything a Dry Run does, **plus** it fills in the contribution amount and saves it for each employee found in the portal.

### Steps

1. After loading your CSV (and ideally after a successful Dry Run), click **"Live Update"**
2. The tool processes each row:
   - Searches for the SSS member
   - If found, enters the contribution amount
   - Clicks the Save button
   - Waits for confirmation
3. The status area shows real-time progress

### What Happens for Each Row

| Outcome | What It Means |
|---|---|
| **Saved** | The contribution amount was entered and saved successfully |
| **Unchanged** | The amount in the portal already matches your CSV — nothing to update |
| **Manual review** | The SSS number wasn't found — you need to enter this one manually |
| **Failed** | Something went wrong (see the detail column in the results) |
| **Stopped** | You pressed the Stop button during this row |

> **⚠️ Important:** If 5 rows fail in a row, the tool stops automatically to prevent repeated errors. Check your portal connection and try again.

---

## 9. Download the Results

After a Dry Run or Live Update finishes (or if you stop it midway), you can download a report.

### Steps

1. Click the **"Download CSV"** button
2. A CSV file will be downloaded to your computer with a name like:
   `sss-contribution-results-1725123456789.csv`
3. Open it in Excel or Google Sheets to review

### What's in the Results File

| Column | Description |
|---|---|
| `rowNumber` | The row number from your original CSV |
| `Name` | Employee name |
| `EmpCode` | Employee code |
| `SSS` | SSS member number |
| `Amount` | Contribution amount |
| `status` | Result: `found`, `saved`, `unchanged`, `manual-review`, `failed`, or `stopped` |
| `detail` | Additional information about what happened |

---

## 10. Understanding the Results

### Status Breakdown

| Status | Color | Action Needed? |
|---|---|---|
| `found` | — | Dry Run only: the member exists in the portal. No action needed. |
| `saved` | ✅ | Live Update: amount was saved successfully. No action needed. |
| `unchanged` | ✅ | The amount already matched. No action needed. |
| `manual-review` | ⚠️ | **Yes.** The SSS number was not found. Log in to the portal and enter this employee's contribution manually. |
| `invalid` | ⚠️ | **Yes.** The CSV row had errors (missing name, bad amount, etc.). Fix your CSV and re-upload. |
| `failed` | ❌ | **Yes.** Something went wrong during processing. Check the `detail` column for the reason. |
| `stopped` | — | You pressed Stop. Re-run if you want to continue. |

### Recommended Workflow

```
1. Prepare CSV
    ↓
2. Load CSV in the panel
    ↓
3. Dry Run  →  Review results  →  Fix any issues in CSV
    ↓
4. Live Update  →  Download results
    ↓
5. Manually handle "manual-review" rows on the portal
```

---

## 11. Stopping a Run

If you need to stop a Dry Run or Live Update while it's running:

1. Click the **"Stop"** button in the panel
2. The current row will finish processing and then the run will stop
3. All rows processed so far will still appear in the results
4. You can download the partial results using the **"Download CSV"** button

> **💡 Tip:** After stopping, you can load the same (or a modified) CSV and run again. The tool starts fresh each time you load a file.

---

## 12. Troubleshooting

### The upload panel doesn't appear

| Possible Cause | Solution |
|---|---|
| Tampermonkey is disabled | Click the Tampermonkey icon → make sure it says "Enabled" |
| The script is turned off | Open Tampermonkey Dashboard → check that the script toggle is ON |
| You're not on the dashboard page | The script only works on `https://employer.sss.gov.ph/employer/auth/dashboard` |
| The page hasn't fully loaded | Wait for the page to finish loading, or refresh with `F5` |

### "Portal frame did not become ready"

This means the tool couldn't find the portal content area inside the dashboard page. Try:

1. **Refresh the page** (`F5`)
2. Make sure you are on the **Dashboard** and the portal content (with search fields) is visible
3. Wait a few seconds for the portal frame to fully load before clicking Dry Run or Live Update

### "Search controls not ready" or "Search box not ready"

The search form inside the portal hasn't loaded yet. Try:

1. Refresh the page
2. Wait for the portal content to fully appear before starting

### CSV load fails

| Error | Solution |
|---|---|
| "CSV file is empty" | Make sure your file has data (and is saved as `.csv`) |
| "Missing required column(s): …" | Check that your column headers match exactly: `Name`, `EmpCode`, `SSS`, `Amount` |

### Too many failures — run stops early

If 5 rows fail in a row, the tool stops automatically. This usually means:

- Your session timed out — **log in again** and refresh the page
- The portal is temporarily slow or down — wait and try again later

### Script stopped working after a portal update

The SSS portal may change its page layout from time to time. If the script stops working:

1. Check for an updated version of the script from your administrator
2. If you're comfortable editing code, the selector settings are near the top of the script file in the `CONFIG.portal` section

---

## 13. Frequently Asked Questions

### Is this safe? Will it mess up my portal data?

- **Dry Run** makes **zero changes** — it only checks if SSS numbers exist. It's completely safe.
- **Live Update** will enter and save contribution amounts. Always do a Dry Run first to verify your data.

### Can I run this on Firefox / Edge / Safari?

Tampermonkey is available for most browsers. The script should work, but it has only been tested on **Google Chrome**.

### Do I need to keep the browser tab open while it runs?

**Yes.** The script runs inside your browser tab. If you close the tab or navigate away, the run will stop. Keep the tab open and visible while it processes.

### Can I process hundreds of employees?

Yes. The tool processes one row at a time with built-in delays to avoid overloading the portal. For large files, it may take several minutes. You can watch the progress bar and status updates.

### What happens if my internet connection drops?

The current row will likely fail. If 5 rows fail in a row, the run stops automatically. Reconnect, refresh the page, log back in, and run again.

### Can I re-run the same CSV?

Yes. Loading a CSV always starts fresh. If some rows were already saved on the portal, the tool will report them as **"unchanged"** (the amount already matches).

### Does this work with multiple employer accounts?

The script works on whichever employer account is currently logged in. Log in to the correct account before starting.

---

> **Need help?** Contact your system administrator or reach out at [conneqly.com](https://conneqly.com).
