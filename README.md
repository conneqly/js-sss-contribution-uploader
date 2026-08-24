# js-sss-contribution-uploader

Tampermonkey userscript for SSS employer contribution CSV processing.

## CSV format

Required headers:

- `Name`
- `EmpCode`
- `SSS`
- `Amount`

`SSS` is the member SSS ID. `EmpCode` is the employee ID.

## What it does

- Adds an upper-right upload panel on the SSS portal
- Parses CSV locally in the browser
- Runs a dry-run search by SSS ID without changing portal data
- Runs a live update flow for matching members
- Flags missing SSS IDs for manual review
- Shows progress and summary status
- Exports the row results as CSV
- Includes a Stop button to abort the current row

## Setup

1. Open the userscript file in `src/sss-contribution-uploader.user.js`.
2. Install it in Tampermonkey.
3. The script targets the employer dashboard page and reads the `#prncFrame` iframe inside it.
4. If the portal DOM changes, adjust the selector lists near the top of the file.

## Notes

- The script does not handle login or session recovery.
- Portal search and update controls are now wired to `searchMethodSSS Number`, `searchBox`, `searchButton`, `SALARY*`, `SSNUM*`, and `saveChanges`.
