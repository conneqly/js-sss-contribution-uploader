// ==UserScript==
// @name         SSS Contribution Uploader
// @namespace    https://conneqly.com/
// @version      0.1.7
// @description  Upload SSS contribution CSV rows through the portal with dry-run and live update modes.
// @author       macoymejia.com
// @match        https://employer.sss.gov.ph/employer/auth/dashboard*
// @grant       GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  if (window.__SSSContributionUploaderLoaded) {
    return;
  }
  window.__SSSContributionUploaderLoaded = true;

  const CONFIG = {
    panelId: 'sss-contribution-uploader-panel',
    csvHeaders: ['Name', 'EmpCode', 'SSS', 'Amount'],
    searchTimeoutMs: 8000,
    saveTimeoutMs: 60000,
    actionDelayMs: 300,
    portalFrameSelector: '#prncFrame',
    portal: {
      searchMethodRadioSelectors: [
        'input[type="radio"][id="searchMethodSSS Number"]',
        'input[type="radio"][name="searchMethodSSS Number"]',
        'input[type="radio"][value="SSS Number"]'
      ],
      searchBoxSelector: '#searchBox',
      searchButtonSelector: '#searchButton',
      memberRowLabelSelector: 'label[id^="SSNUM"]',
      memberAmountSelector: 'input.gross_income[id^="SALARY"]',
      saveButtonSelector: '#saveChanges',
      saveConfirmationTexts: ['saved', 'success', 'updated', 'record saved', 'changes saved'],
      saveErrorTexts: ['error', 'failed', 'invalid'],
      noResultsTexts: ['no records', 'no result', 'not found', 'no data'],
      loadingTexts: ['loading', 'please wait', 'searching']
    }
  };

  const state = {
    fileName: '',
    rows: [],
    reportRows: [],
    running: false,
    mode: null,
    startedAt: null,
    finishedAt: null,
    lastReport: null,
    consecutiveFailures: 0,
    stopRequested: false
  };

  const ui = {};

  bootstrap();

  function bootstrap() {
    if (!document.body) {
      requestAnimationFrame(bootstrap);
      return;
    }

    injectStyles();
    renderPanel();
    wireEvents();
  }

  function injectStyles() {
    const css = `
      #${CONFIG.panelId} {
        position: fixed;
        top: 16px;
        right: 16px;
        width: 360px;
        z-index: 2147483647;
        background: #111827;
        color: #f9fafb;
        border: 1px solid #374151;
        border-radius: 12px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
        font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        overflow: hidden;
      }
      #${CONFIG.panelId} * { box-sizing: border-box; }
      #${CONFIG.panelId} .sss-header {
        padding: 12px 14px;
        border-bottom: 1px solid #374151;
        background: linear-gradient(180deg, #1f2937, #111827);
      }
      #${CONFIG.panelId} .sss-title {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
      }
      #${CONFIG.panelId} .sss-subtitle {
        margin-top: 4px;
        color: #cbd5e1;
        font-size: 12px;
      }
      #${CONFIG.panelId} .sss-body {
        padding: 12px 14px 14px;
        display: grid;
        gap: 10px;
      }
      #${CONFIG.panelId} label {
        display: grid;
        gap: 6px;
        color: #e5e7eb;
      }
      #${CONFIG.panelId} input[type="file"] {
        width: 100%;
        color: #cbd5e1;
      }
      #${CONFIG.panelId} .sss-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      #${CONFIG.panelId} button {
        appearance: none;
        border: 1px solid #4b5563;
        background: #1f2937;
        color: #f9fafb;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
      }
      #${CONFIG.panelId} button:hover { background: #273244; }
      #${CONFIG.panelId} button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      #${CONFIG.panelId} .sss-status,
      #${CONFIG.panelId} .sss-report {
        background: #0b1220;
        border: 1px solid #243041;
        border-radius: 10px;
        padding: 10px;
      }
      #${CONFIG.panelId} .sss-status { white-space: pre-wrap; }
      #${CONFIG.panelId} progress {
        width: 100%;
        height: 14px;
      }
      #${CONFIG.panelId} .sss-report {
        max-height: 260px;
        overflow: auto;
        font-size: 12px;
        white-space: pre-wrap;
      }
      #${CONFIG.panelId} .sss-muted { color: #94a3b8; }
      #${CONFIG.panelId} .sss-error { color: #fca5a5; }
      #${CONFIG.panelId} .sss-ok { color: #86efac; }
      #${CONFIG.panelId} .sss-small { font-size: 12px; color: #cbd5e1; }
    `;

    if (typeof GM_addStyle === 'function') {
      GM_addStyle(css);
      return;
    }

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderPanel() {
    const panel = document.createElement('section');
    panel.id = CONFIG.panelId;
    panel.innerHTML = `
      <div class="sss-header">
        <h1 class="sss-title">SSS Contribution Uploader</h1>
        <div class="sss-subtitle">CSV import, dry-run, live update, and progress reporting</div>
      </div>
      <div class="sss-body">
        <label>
          <span>CSV file</span>
          <input id="sss-csv-input" type="file" accept=".csv,text/csv" />
        </label>
        <div class="sss-row">
          <button id="sss-dry-run" disabled>Dry Run</button>
          <button id="sss-live-run" disabled>Live Update</button>
          <button id="sss-stop" disabled>Stop</button>
        </div>
        <div class="sss-row">
          <button id="sss-download-csv" disabled>Download CSV</button>
        </div>
        <div class="sss-status" id="sss-status">Load a CSV file to begin.</div>
        <progress id="sss-progress" value="0" max="100"></progress>
        <div class="sss-small" id="sss-progress-text">0 / 0</div>
      </div>
    `;

    document.body.appendChild(panel);

    ui.panel = panel;
    ui.csvInput = panel.querySelector('#sss-csv-input');
    ui.dryRun = panel.querySelector('#sss-dry-run');
    ui.liveRun = panel.querySelector('#sss-live-run');
    ui.stop = panel.querySelector('#sss-stop');
    ui.downloadCsv = panel.querySelector('#sss-download-csv');
    ui.status = panel.querySelector('#sss-status');
    ui.progress = panel.querySelector('#sss-progress');
    ui.progressText = panel.querySelector('#sss-progress-text');
  }

  function wireEvents() {
    ui.csvInput.addEventListener('change', onFileSelected);
    ui.dryRun.addEventListener('click', () => runBatch('dry-run'));
    ui.liveRun.addEventListener('click', () => runBatch('live'));
    ui.stop.addEventListener('click', requestStop);
    ui.downloadCsv.addEventListener('click', downloadReportCsv);
  }

  async function onFileSelected(event) {
    if (state.running) {
      event.target.value = '';
      return;
    }

    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      const text = (await file.text()).replace(/^\uFEFF/, '');
      const parsed = parseCsv(text);
      const validation = validateRows(parsed.rows);

      state.fileName = file.name;
      state.rows = validation.rows;
      state.reportRows = validation.rows.map((row) => ({
        rowNumber: row.rowNumber,
        name: row.Name,
        empCode: row.EmpCode,
        sss: row.SSS,
        amount: row.Amount,
        status: row.manualReviewReason ? 'manual-review' : row.issues.length ? 'invalid' : 'ready',
        detail: [row.manualReviewReason, row.issues.join('; ')].filter(Boolean).join('; ')
      }));

      state.startedAt = null;
      state.finishedAt = null;
      state.lastReport = null;
      state.consecutiveFailures = 0;
      state.stopRequested = false;
      setStatus(renderLoadedState(validation));
      setRunButtons(validation.rows.length > 0);
    } catch (error) {
      state.rows = [];
      state.reportRows = [];
      setRunButtons(false);
      setStatus(`CSV load failed: ${error.message}`, true);
      setProgress(0, 0);
    }
  }

  function renderLoadedState(validation) {
    const manualReviewCount = validation.rows.filter((row) => row.manualReviewReason).length;
    const invalidCount = validation.rows.filter((row) => row.issues.length > 0).length;
    const readyCount = validation.rows.filter((row) => !row.manualReviewReason && row.issues.length === 0).length;
    const parts = [
      `File: ${state.fileName}`,
      `Rows: ${validation.rows.length}`,
      `Ready: ${readyCount}`,
      `Manual review: ${manualReviewCount}`,
      `Needs attention: ${invalidCount}`,
      `Required columns: ${CONFIG.csvHeaders.join(', ')}`
    ];
    return parts.join('\n');
  }

  function setRunButtons(enabled) {
    ui.csvInput.disabled = state.running;
    ui.dryRun.disabled = !enabled || state.running;
    ui.liveRun.disabled = !enabled || state.running;
    ui.stop.disabled = !state.running;
    ui.downloadCsv.disabled = state.running || state.reportRows.length === 0;
  }

  function requestStop() {
    if (!state.running) {
      return;
    }

    state.stopRequested = true;
    ui.stop.disabled = true;
    setStatus('Stop requested. Current row will abort.', true);
  }

  async function runBatch(mode) {
    if (state.running) {
      return;
    }

    const rows = state.rows.slice();
    if (!rows.length) {
      setStatus('Load a CSV file first.', true);
      return;
    }

    state.running = true;
    state.mode = mode;
    state.startedAt = new Date();
    state.finishedAt = null;
    state.consecutiveFailures = 0;
    state.stopRequested = false;
    setRunButtons(false);
    setProgress(0, rows.length);
    setStatus(`${mode === 'dry-run' ? 'Dry run' : 'Live update'} started for ${rows.length} rows.`);

    const summary = {
      mode,
      fileName: state.fileName,
      startedAt: state.startedAt.toISOString(),
      finishedAt: null,
      totalRows: rows.length,
      processed: 0,
      valid: 0,
      invalid: 0,
      found: 0,
      updated: 0,
      manualReview: 0,
      failed: 0,
      stopped: 0,
      items: []
    };

    try {
      for (let index = 0; index < rows.length; index += 1) {
        if (state.stopRequested) {
          break;
        }

        const row = rows[index];
        let reportItem;
        try {
          reportItem = await processRow(row, mode, index + 1, rows.length);
        } catch (error) {
          if (isStopError(error) || state.stopRequested) {
            reportItem = {
              rowNumber: row.rowNumber,
              name: row.Name,
              empCode: row.EmpCode,
              sss: row.SSS,
              amount: row.Amount,
              status: 'stopped',
              detail: 'Stopped by user.'
            };
            summary.items.push(reportItem);
            summary.processed += 1;
            summary.stopped += 1;
            state.reportRows[index] = reportItem;
            setProgress(index + 1, rows.length);
            updateLiveStatus(summary, reportItem, index + 1, rows.length);
            break;
          }

          reportItem = {
            rowNumber: row.rowNumber,
            name: row.Name,
            empCode: row.EmpCode,
            sss: row.SSS,
            amount: row.Amount,
            status: 'failed',
            detail: error.message
          };
        }
        summary.items.push(reportItem);
        summary.processed += 1;

        if (reportItem.status === 'invalid') {
          summary.invalid += 1;
        } else if (reportItem.status === 'found') {
          summary.found += 1;
          if (mode === 'live') {
            summary.updated += 1;
          }
        } else if (reportItem.status === 'saved' || reportItem.status === 'unchanged') {
          summary.updated += 1;
        } else if (reportItem.status === 'manual-review') {
          summary.manualReview += 1;
        } else if (reportItem.status === 'failed') {
          summary.failed += 1;
        } else if (reportItem.status === 'stopped') {
          summary.stopped += 1;
        }

        if (reportItem.status === 'failed') {
          state.consecutiveFailures += 1;
        } else {
          state.consecutiveFailures = 0;
        }

        if (state.consecutiveFailures >= 5) {
          throw new Error('Stopped after 5 consecutive failed rows.');
        }

        state.reportRows[index] = reportItem;
        setProgress(index + 1, rows.length);
        updateLiveStatus(summary, reportItem, index + 1, rows.length);
      }

      summary.finishedAt = new Date().toISOString();
      state.finishedAt = new Date();
      summary.startedAt = state.startedAt.toISOString();
      setStatus(
        `${state.stopRequested ? 'Stopped by user' : mode === 'dry-run' ? 'Dry run' : 'Live update'} complete. ` +
          `Found ${summary.found}, updated ${summary.updated}, manual review ${summary.manualReview}, invalid ${summary.invalid}, stopped ${summary.stopped}, failed ${summary.failed}.`
      );
      state.reportRows = summary.items;
      state.lastReport = summary;
      ui.downloadCsv.disabled = false;
    } catch (error) {
      const message = `Run stopped: ${error.message}`;
      setStatus(message, true);
      summary.finishedAt = new Date().toISOString();
      state.lastReport = summary;
      ui.downloadCsv.disabled = false;
    } finally {
      state.running = false;
      state.stopRequested = false;
      setRunButtons(state.rows.length > 0);
    }
  }

  async function processRow(row, mode, position, total) {
    const baseItem = {
      rowNumber: row.rowNumber,
      name: row.Name,
      empCode: row.EmpCode,
      sss: row.SSS,
      amount: row.Amount,
      status: 'failed',
      detail: ''
    };

    if (row.manualReviewReason) {
      return {
        ...baseItem,
        status: 'manual-review',
        detail: [row.manualReviewReason, row.issues.join('; ')].filter(Boolean).join('; ')
      };
    }

    if (row.issues.length > 0) {
      return {
        ...baseItem,
        status: 'invalid',
        detail: row.issues.join('; ')
      };
    }

    setStatus(`Processing ${position}/${total}: ${row.SSS}`);

    const member = await searchMember(row.SSS);
    if (!member.found) {
      return {
        ...baseItem,
        status: 'manual-review',
        detail: member.manualReviewReason || member.text || 'SSS ID not found on portal search results.'
      };
    }

    if (mode === 'dry-run') {
      return {
        ...baseItem,
        status: 'found',
        detail: 'Found in portal. No changes made.'
      };
    }

    const update = await updateContribution(member, row);
    return {
      ...baseItem,
      status: update.ok ? update.status : 'failed',
      detail: update.ok ? update.detail : update.reason
    };
  }

  async function searchMember(sssId) {
    let root;
    try {
      root = await waitForPortalScope();
      const searchMethod = findSearchMethodRadio(root);
      if (!searchMethod) {
        return { found: false, element: null, text: '', manualReviewReason: 'Search controls not ready.' };
      }

      clickElement(searchMethod);

      const searchInput = await waitForSearchInput(root);
      if (!searchInput) {
        return { found: false, element: null, text: '', manualReviewReason: 'Search box not ready.' };
      }

      setInputValue(searchInput, sssId);
      throwIfStopped();
      const searchButton = root.querySelector(CONFIG.portal.searchButtonSelector);
      if (searchButton) {
        clickElement(searchButton);
      } else {
        const view = root.defaultView || window;
        searchInput.dispatchEvent(new view.KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      }
    } catch (error) {
      if (isStopError(error)) {
        throw error;
      }
      return { found: false, element: null, text: '', manualReviewReason: error.message };
    }

    const startedAt = Date.now();
    let lastText = '';

    while (Date.now() - startedAt < CONFIG.searchTimeoutMs) {
      const match = findResultForSSS(root, sssId);
      if (match) {
        return { found: true, element: match, label: match, rowSuffix: match.id.replace(/^SSNUM/, ''), text: match.textContent || '' };
      }

      const containerText = readPortalText(root);
      if (containerText && containerText !== lastText) {
        lastText = containerText;
        if (containsAny(containerText, CONFIG.portal.noResultsTexts)) {
          return { found: false, element: null, text: containerText };
        }
      }

      await sleep(150);
      throwIfStopped();
    }

    return { found: false, element: null, text: readPortalText(root), timedOut: true, manualReviewReason: 'Search timed out.' };
  }

  async function updateContribution(memberMatch, row) {
    const root = await waitForPortalScope();
    const amountInput = findAmountInput(root, memberMatch.label);
    if (!amountInput) {
      return { ok: false, reason: 'Amount input not found in the member context.' };
    }

    const targetAmount = normalizeAmount(row.Amount);
    const stableRow = await waitForStableMemberAmount(root, row.SSS);
    if (!stableRow) {
      return { ok: false, reason: 'Unable to read current amount for the member row.' };
    }

    const currentAmount = stableRow.amount;
    if (amountsEqual(currentAmount, targetAmount)) {
      return { ok: true, status: 'unchanged', detail: 'Amount already matched.' };
    }

    setInputValue(amountInput, row.Amount);
    await sleep(CONFIG.actionDelayMs);
    throwIfStopped();

    const saveButton = root.querySelector(CONFIG.portal.saveButtonSelector) || findButtonInScope(root, ['Save', 'Update', 'Submit', 'Confirm']);
    if (!saveButton) {
      return { ok: false, reason: 'Save/update button not found after locating the member.' };
    }

    clickElement(saveButton);
    const saveResult = await waitForSaveComplete(root, saveButton, row.SSS, targetAmount, currentAmount);
    if (!saveResult.ok) {
      return saveResult;
    }

    return { ok: true, status: saveResult.status || 'saved', detail: saveResult.detail || `Updated amount to ${row.Amount}.` };
  }

  function findSearchMethodRadio(root) {
    for (const selector of CONFIG.portal.searchMethodRadioSelectors) {
      const element = root.querySelector(selector);
      if (isVisible(element)) {
        return element;
      }
    }

    const radios = Array.from(root.querySelectorAll('input[type="radio"]'));
    return radios.find((element) => {
      const label = getAssociatedLabel(root, element);
      const text = normalizeText(`${label} ${element.value || ''} ${element.id || ''} ${element.name || ''}`);
      return isVisible(element) && text.includes('sss number');
    }) || null;
  }

  function findSearchInput(root) {
    const selectors = [CONFIG.portal.searchBoxSelector];
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      if (isVisible(element)) {
        return element;
      }
    }

    return findLabeledInput(['sss', 'member', 'search'], root);
  }

  function findAmountInput(root, memberLabel = null) {
    if (memberLabel && memberLabel.id) {
      const suffix = memberLabel.id.replace(/^SSNUM/, '');
      if (suffix) {
        const rowScope = findMemberRowScope(memberLabel) || root;
        const candidate = rowScope.querySelector(`input#SALARY${CSS.escape(suffix)}.gross_income`);
        if (isVisible(candidate)) {
          return candidate;
        }
      }
    }

    return null;
  }

  function findButtonInScope(scope, texts) {
    const buttons = Array.from(scope.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]'));
    return buttons.find((button) => {
      const label = getElementLabel(button);
      return isVisible(button) && containsAny(label, texts);
    }) || null;
  }

  function findResultForSSS(root, sssId) {
    const label = findMemberLabel(root, sssId);
    return label || null;
  }

  function findMemberLabel(root, sssId) {
    const labels = Array.from(root.querySelectorAll(CONFIG.portal.memberRowLabelSelector));
    const target = normalizeDigits(sssId);
    return labels.find((element) => isVisible(element) && normalizeDigits(element.textContent || '') === target) || null;
  }

  function findMemberRowScope(label) {
    if (!label) {
      return null;
    }

    return label.closest('tr, [role="row"], li, section') || label.parentElement || null;
  }

  function readPortalText(root) {
    return root.body ? root.body.textContent || '' : '';
  }

  function readMemberRowAmount(root, sssId) {
    const label = findMemberLabel(root, sssId);
    if (!label) {
      return null;
    }

    const rowScope = findMemberRowScope(label) || root;
    const amountInput = findAmountInput(root, label);
    if (!amountInput) {
      return null;
    }

    return {
      label,
      rowScope,
      amountInput,
      amount: normalizeAmount(amountInput.value || '')
    };
  }

  async function waitForStableMemberAmount(root, sssId) {
    const deadline = Date.now() + 2000;
    let lastAmount = null;
    let lastChangeAt = 0;

    while (Date.now() < deadline) {
      throwIfStopped();
      const rowState = readMemberRowAmount(root, sssId);
      if (!rowState) {
        await sleep(150);
        continue;
      }

      if (rowState.amount === lastAmount) {
        if (Date.now() - lastChangeAt >= 200) {
          return rowState;
        }
      } else {
        lastAmount = rowState.amount;
        lastChangeAt = Date.now();
      }

      await sleep(150);
    }

    return readMemberRowAmount(root, sssId);
  }

  function findLabeledInput(labels, root = document) {
    const labelElements = Array.from(root.querySelectorAll('label'));
    for (const label of labelElements) {
      const text = normalizeText(label.textContent || '');
      if (!containsAny(text, labels)) {
        continue;
      }

      const input = label.querySelector('input, textarea, select');
      if (isVisible(input)) {
        return input;
      }

      const forId = label.getAttribute('for');
      if (forId) {
        const linked = root.querySelector(`#${CSS.escape(forId)}`);
        if (isVisible(linked)) {
          return linked;
        }
      }
    }

    const ariaCandidates = Array.from(root.querySelectorAll('input, textarea, select'));
    return ariaCandidates.find((element) => {
      const aria = normalizeText(`${element.getAttribute('aria-label') || ''} ${element.getAttribute('placeholder') || ''} ${element.name || ''} ${element.id || ''}`);
      return containsAny(aria, labels) && isVisible(element);
    }) || null;
  }

  function setInputValue(input, value) {
    const tagName = input && input.tagName ? input.tagName.toUpperCase() : '';
    const prototype = tagName === 'INPUT' || tagName === 'TEXTAREA'
      ? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')
      : null;
    const view = input && input.ownerDocument && input.ownerDocument.defaultView ? input.ownerDocument.defaultView : window;

    if (prototype && prototype.set) {
      prototype.set.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new view.Event('input', { bubbles: true }));
    input.dispatchEvent(new view.Event('change', { bubbles: true }));
  }

  function clickElement(element) {
    const view = element && element.ownerDocument && element.ownerDocument.defaultView ? element.ownerDocument.defaultView : window;
    if (typeof element.click === 'function') {
      element.click();
      return;
    }

    element.dispatchEvent(new view.MouseEvent('click', { bubbles: true, cancelable: true, view }));
  }

  function validateRows(rows) {
    return {
      rows: rows.map((row, index) => validateRow(row, index + 2))
    };
  }

  function validateRow(row, rowNumber) {
    const issues = [];
    const normalized = {
      rowNumber,
      Name: (row.Name || '').trim(),
      EmpCode: (row.EmpCode || '').trim(),
      SSS: (row.SSS || '').trim(),
      Amount: normalizeAmount((row.Amount || '').trim())
    };

    if (!normalized.Name) issues.push('Missing Name');
    if (!normalized.EmpCode) issues.push('Missing EmpCode');
    if (!normalized.Amount) issues.push('Missing Amount');
    if (normalized.Amount && Number.isNaN(Number(normalized.Amount.replace(/,/g, '')))) issues.push('Amount is not numeric');

    return {
      ...normalized,
      manualReviewReason: normalized.SSS ? '' : 'Missing SSS',
      issues
    };
  }

  function parseCsv(text) {
    const lines = splitCsv(text);
    if (lines.length === 0) {
      throw new Error('CSV file is empty.');
    }

    const headers = lines[0].map((cell) => cell.trim());
    const headerIndex = new Map(headers.map((header, index) => [normalizeHeader(header), index]));

    const missingHeaders = CONFIG.csvHeaders.filter((header) => !headerIndex.has(normalizeHeader(header)));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required column(s): ${missingHeaders.join(', ')}`);
    }

    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.length === 1 && line[0].trim() === '') {
        continue;
      }

      rows.push({
        Name: line[headerIndex.get(normalizeHeader('Name'))] || '',
        EmpCode: line[headerIndex.get(normalizeHeader('EmpCode'))] || '',
        SSS: line[headerIndex.get(normalizeHeader('SSS'))] || '',
        Amount: line[headerIndex.get(normalizeHeader('Amount'))] || ''
      });
    }

    return { headers, rows };
  }

  function splitCsv(text) {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let index = 0; index < normalized.length; index += 1) {
      const char = normalized[index];
      const next = normalized[index + 1];

      if (char === '"' && inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        currentRow.push(currentCell);
        currentCell = '';
        continue;
      }

      if (char === '\n' && !inQuotes) {
        currentRow.push(currentCell);
        lines.push(currentRow);
        currentRow = [];
        currentCell = '';
        continue;
      }

      currentCell += char;
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell);
      lines.push(currentRow);
    }

    return lines;
  }

  function normalizeAmount(value) {
    if (!value) {
      return '';
    }

    const cleaned = value.replace(/[\s,]/g, '');
    return cleaned;
  }

  function parseAmount(value) {
    const cleaned = normalizeAmount(value);
    if (!cleaned) {
      return null;
    }

    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function amountsEqual(left, right) {
    const leftParsed = parseAmount(left);
    const rightParsed = parseAmount(right);

    if (leftParsed !== null && rightParsed !== null) {
      return Math.abs(leftParsed - rightParsed) < 0.0001;
    }

    return normalizeAmount(left) === normalizeAmount(right);
  }

  function normalizeHeader(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function normalizeText(value) {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function normalizeDigits(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  function containsAny(value, words) {
    const haystack = normalizeText(value || '');
    return words.some((word) => haystack.includes(normalizeText(word)));
  }

  function isVisible(element) {
    if (!element) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (!style) {
      return true;
    }

    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function getElementLabel(element) {
    const aria = element.getAttribute ? element.getAttribute('aria-label') || '' : '';
    const title = element.getAttribute ? element.getAttribute('title') || '' : '';
    const text = element.textContent || '';
    return `${aria} ${title} ${text}`.trim();
  }

  function setStatus(message, isError = false) {
    ui.status.textContent = message;
    ui.status.classList.toggle('sss-error', Boolean(isError));
    ui.status.classList.toggle('sss-ok', !isError);
  }

  function setReport(text) {
    void text;
  }

  function setProgress(current, total) {
    ui.progress.max = Math.max(total, 1);
    ui.progress.value = current;
    ui.progressText.textContent = `${current} / ${total}`;
  }

  function updateLiveStatus(summary, reportItem, current, total) {
    const counts = `found ${summary.found}, updated ${summary.updated}, manual review ${summary.manualReview}, failed ${summary.failed}`;
    const item = `${reportItem.rowNumber}: ${reportItem.sss} - ${reportItem.status}`;
    ui.progressText.textContent = `${current} / ${total} | ${counts}`;
    ui.status.textContent = `${item}\n${counts}`;
  }

  function renderSummary(mode, totalRows, processedRows, items, summary = null) {
    const totals = summary || aggregateItems(items, mode, totalRows, processedRows);
    const lines = [
      `Mode: ${mode}`,
      `File: ${state.fileName || '(none)'}`,
      totals.startedAt ? `Started: ${totals.startedAt}` : '',
      totals.finishedAt ? `Finished: ${totals.finishedAt}` : '',
      `Rows: ${totalRows}`,
      `Processed: ${processedRows}`,
      `Invalid: ${totals.invalid}`,
      `Found: ${totals.found}`,
      `Updated: ${totals.updated}`,
      `Manual review: ${totals.manualReview}`,
      `Failed: ${totals.failed}`,
      ''
    ].filter(Boolean);

    for (const item of items) {
      lines.push(
        `${item.rowNumber} | ${item.name} | ${item.empCode} | ${item.sss} | ${item.amount} | ${item.status} | ${item.detail || ''}`.trim()
      );
    }

    return lines.join('\n');
  }

  function aggregateItems(items, mode, totalRows, processedRows) {
    const summary = {
      mode,
      totalRows,
      processedRows,
      startedAt: null,
      finishedAt: null,
      invalid: 0,
      found: 0,
      updated: 0,
      manualReview: 0,
      failed: 0
    };

    for (const item of items) {
      if (item.status === 'found') summary.found += 1;
      if (mode === 'live' && item.status === 'found') summary.updated += 1;
      if (item.status === 'manual-review') summary.manualReview += 1;
      if (item.status === 'failed' || item.status === 'invalid') summary.failed += 1;
      if (item.status === 'invalid') summary.invalid += 1;
    }

    return summary;
  }

  function downloadReportCsv() {
    try {
      const rows = (state.lastReport && state.lastReport.items) || state.reportRows || [];
      const headers = ['rowNumber', 'Name', 'EmpCode', 'SSS', 'Amount', 'status', 'detail'];
      const lines = [headers.join(',')];

      for (const row of rows) {
        lines.push([
          csvCell(row.rowNumber),
          csvCell(row.name),
          csvCell(row.empCode),
          csvCell(row.sss),
          csvCell(row.amount),
          csvCell(row.status),
          csvCell(row.detail)
        ].join(','));
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sss-contribution-results-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setStatus(`CSV export failed: ${error.message}`, true);
    }
  }

  function throwIfStopped() {
    if (state.stopRequested) {
      const error = new Error('Stopped by user.');
      error.name = 'StopRequestedError';
      throw error;
    }
  }

  function isStopError(error) {
    return Boolean(error) && (error.name === 'StopRequestedError' || error.message === 'Stopped by user.');
  }

  function csvCell(value) {
    const text = String(value ?? '');
    if (/[,"\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  async function waitForPortalScope() {
    const deadline = Date.now() + CONFIG.searchTimeoutMs;
    while (Date.now() < deadline) {
      throwIfStopped();
      const root = getPortalDocument();
      if (root && root.body && findPortalFrame(document) && findSearchMethodRadio(root)) {
        return root;
      }

      await sleep(250);
    }

    throw new Error('Portal frame did not become ready. Make sure #prncFrame is loaded inside the dashboard.');
  }

  async function waitForSearchInput(root) {
    const deadline = Date.now() + CONFIG.searchTimeoutMs;
    while (Date.now() < deadline) {
      throwIfStopped();
      const input = findSearchInput(root);
      if (input) {
        return input;
      }

      await sleep(250);
    }

    return null;
  }

  async function waitForSaveComplete(root, saveButton, sssId, expectedAmount, beforeAmount) {
    const deadline = Date.now() + CONFIG.saveTimeoutMs;
    const targetAmount = normalizeAmount(expectedAmount);
    const previousAmount = normalizeAmount(beforeAmount);
    const startedAt = Date.now();
    let sawBusyState = false;

    while (Date.now() < deadline) {
      throwIfStopped();
      const rowState = readMemberRowAmount(root, sssId);
      const currentAmount = rowState ? rowState.amount : '';

      if (saveButton.disabled || saveButton.getAttribute('aria-busy') === 'true') {
        sawBusyState = true;
      }

      if (rowState && amountsEqual(currentAmount, targetAmount) && !amountsEqual(currentAmount, previousAmount)) {
        const elapsed = Date.now() - startedAt;
        if (elapsed >= 1000 || sawBusyState) {
          return { ok: true, status: 'saved', detail: 'Saved.' };
        }
      }

      await sleep(250);
    }

    const finalRowState = readMemberRowAmount(root, sssId);
    if (finalRowState && amountsEqual(finalRowState.amount, targetAmount) && !amountsEqual(finalRowState.amount, previousAmount)) {
      return { ok: true, status: 'saved', detail: 'Saved.' };
    }

    return { ok: false, reason: 'Timed out waiting for save confirmation.' };
  }

  function getPortalDocument() {
    const frame = findPortalFrame(document);
    if (!frame) {
      return null;
    }

    try {
      return frame.contentDocument || frame.contentWindow.document || null;
    } catch {
      return null;
    }
  }

  function findPortalFrame(root = document) {
    return root.querySelector(CONFIG.portalFrameSelector);
  }

  function getAssociatedLabel(root, input) {
    if (!input) {
      return '';
    }

    if (input.id) {
      const exact = root.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if (exact) {
        return exact.textContent || '';
      }
    }

    const parentLabel = input.closest('label');
    return parentLabel ? parentLabel.textContent || '' : '';
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
})();
