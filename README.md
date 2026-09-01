# SSS Contribution Uploader

A browser-based tool that automates uploading employee SSS contribution amounts through the [SSS Employer Portal](https://employer.sss.gov.ph). It runs inside your browser using the **Tampermonkey** extension — no software installation needed beyond that.

> **📖 First time?** See the full [User Guide](docs/USER_GUIDE.md) for step-by-step instructions with examples.

---

## What it does

| Feature | Description |
|---|---|
| **CSV Upload** | Load a CSV file with employee SSS contributions directly in the portal |
| **Dry Run** | Verify that each SSS number exists in the portal — without saving anything |
| **Live Update** | Automatically fill in and save contribution amounts for each employee |
| **Progress Tracking** | See real-time progress, row-by-row status, and a summary at the end |
| **Result Export** | Download a CSV report showing which rows succeeded, failed, or need manual review |
| **Stop Button** | Abort the current run at any time |

## Quick Start

1. Install **Tampermonkey** in Chrome → [chrome.google.com/webstore](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. Open [`src/sss-contribution-uploader.user.js`](src/sss-contribution-uploader.user.js) and click **"Raw"** (or copy-paste its contents into a new Tampermonkey script)
3. Log in to the [SSS Employer Portal](https://employer.sss.gov.ph) dashboard
4. The **SSS Contribution Uploader** panel appears in the upper-right corner — load your CSV and go

## CSV Format

Your CSV file must have these four columns:

```
Name,EmpCode,SSS,Amount
Juan Dela Cruz,EMP001,34-1234567-8,1500.00
Maria Santos,EMP002,34-7654321-0,1800.00
```

| Column | What it is |
|---|---|
| `Name` | Employee name (for your reference) |
| `EmpCode` | Your internal employee ID |
| `SSS` | The employee's SSS member number |
| `Amount` | Contribution amount to upload |

## Documentation

- **[User Guide](docs/USER_GUIDE.md)** — Complete how-to with step-by-step instructions
- **[CSV Result Export Plan](docs/superpowers/plans/2026-08-25-csv-result-export.md)** — Technical design notes

## Important Notes

- You must be **logged in** to the SSS Employer Portal before the script can work. It does not handle login or session timeouts.
- The script reads from the `#prncFrame` iframe inside the dashboard page.
- If the SSS portal changes its page layout, the selector settings near the top of the script file may need to be updated.

---

Built by [macoymejia.com](https://macoymejia.com) · [CONNEQLY](https://conneqly.com)
