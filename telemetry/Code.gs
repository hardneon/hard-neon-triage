/**
 * Hard Neon: Triage — playtest telemetry receiver (Google Apps Script).
 *
 * Paste this into Extensions → Apps Script of a blank Google Sheet.
 * Run `setup` once, then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Put the web-app URL into data/settings.js → "telemetryUrl".
 *
 * Tabs:
 *   Runs     — one row per finished fight (columns added automatically as the game adds fields)
 *   Feedback — one row per submitted rating/comment, linked to a run by runId
 *   Summary  — rebuilt after every submission: win rates, settings, names, ratings, ability use
 *   Settings — B1: version filter for the Summary (e.g. v0.19; blank = all versions). Dev runs (?dev=1) are always left out.
 *
 * After pasting a new version of this script: Deploy → Manage deployments → Edit → Version: New version → Deploy.
 * (Saving alone does not update the live web app.) Use the "Triage" menu → Refresh summary after changing Settings.
 */

const RUNS = 'Runs';
const FEEDBACK = 'Feedback';
const SUMMARY = 'Summary';
const SETTINGS = 'Settings';
const MAX_TEXT = 1000; // cap any single text value
const MAX_FIELDS = 120;

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [RUNS, FEEDBACK, SUMMARY].forEach(name => ss.getSheetByName(name) || ss.insertSheet(name));
  if (!ss.getSheetByName(SETTINGS)) {
    const st = ss.insertSheet(SETTINGS);
    st.getRange('A1:B2').setValues([['Version filter', ''], ['(blank = all versions, e.g. v0.19)', '']]);
    st.getRange('B1').setNumberFormat('@');
    st.getRange('A1').setFontWeight('bold');
  }
  ensureHeaders_(ss.getSheetByName(RUNS), ['receivedAt']);
  ensureHeaders_(ss.getSheetByName(FEEDBACK), ['receivedAt']);
  const first = ss.getSheets()[0];
  if (first.getName() === 'Sheet1' && first.getLastRow() === 0) ss.deleteSheet(first);
  refreshSummary_();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tab = data.type === 'feedback' ? FEEDBACK : data.type === 'run' ? RUNS : null;
    if (!tab) return out_({ ok: false, error: 'unknown type' });
    const row = clean_(data);
    row.receivedAt = new Date();
    appendRow_(ss.getSheetByName(tab) || ss.insertSheet(tab), row);
    refreshSummary_();
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Custom menu so the Summary can be rebuilt after changing Settings.
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Triage').addItem('Refresh summary', 'refreshSummary').addToUi();
}

function refreshSummary() { refreshSummary_(); }

// Handy for checking the URL in a browser.
function doGet() { return out_({ ok: true, msg: 'Triage telemetry is running.' }); }

// ---------- helpers ----------
function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(data) {
  const row = {};
  Object.keys(data).slice(0, MAX_FIELDS).forEach(k => {
    if (k === 'type' || !/^[A-Za-z0-9_]{1,40}$/.test(k)) return;
    let v = data[k];
    if (typeof v === 'string') {
      v = v.slice(0, MAX_TEXT);
      if (/^[=+\-@]/.test(v)) v = "'" + v; // stop text being read as a spreadsheet formula
    } else if (typeof v !== 'number' && typeof v !== 'boolean') {
      v = String(v).slice(0, MAX_TEXT);
    }
    row[k] = v;
  });
  return row;
}

function ensureHeaders_(sheet, keys) {
  let headers = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  const missing = keys.filter(k => headers.indexOf(k) === -1);
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return headers;
}

function appendRow_(sheet, row) {
  const headers = ensureHeaders_(sheet, ['receivedAt'].concat(Object.keys(row)));
  sheet.appendRow(headers.map(h => (h in row ? row[h] : '')));
}

function readTable_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map(r => { const o = {}; headers.forEach((h, i) => { o[h] = r[i]; }); return o; });
}

function count_(rows, key) {
  const m = {};
  rows.forEach(r => { const v = r[key] === '' || r[key] == null ? '(blank)' : String(r[key]); m[v] = (m[v] || 0) + 1; });
  return Object.keys(m).map(k => [k, m[k]]).sort((a, b) => b[1] - a[1]);
}

function avg_(rows, key) {
  const nums = rows.map(r => r[key]).filter(v => v !== '' && v != null && !isNaN(v)).map(Number);
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10 : '';
}

const isTrue_ = v => v === true || v === 'TRUE' || v === 'true';
const pct_ = (n, d) => ({ pct: d ? n / d : 0 }); // written as a real percentage with an explicit format

function refreshSummary_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const st = ss.getSheetByName(SETTINGS);
  const verFilter = st ? String(st.getRange('B1').getValue() || '').trim() : '';
  const keep = r => !isTrue_(r.dev) && (!verFilter || String(r.version) === verFilter);
  const allRuns = readTable_(ss.getSheetByName(RUNS)), allFb = readTable_(ss.getSheetByName(FEEDBACK));
  const runs = allRuns.filter(keep);
  const fb = allFb.filter(keep);
  const devRuns = allRuns.filter(r => isTrue_(r.dev)).length;
  const sh = ss.getSheetByName(SUMMARY) || ss.insertSheet(SUMMARY);
  sh.clear();
  sh.clearFormats();
  const blocks = [];
  const add = (title, header, rows) => blocks.push({ title, header, rows: rows.length ? rows : [['(no data yet)']] });

  const sessions = {}; runs.forEach(r => { sessions[r.sessionId] = 1; });
  const wins = runs.filter(r => r.result === 'win').length;
  add('Overview', ['Metric', 'Value'], [
    ['Fights played', runs.length],
    ['Play sessions', Object.keys(sessions).length],
    ['Wins', wins],
    ['Win rate', runs.length ? pct_(wins, runs.length) : ''],
    ['Feedback entries', fb.length],
    ['Avg fun (1–5)', avg_(fb, 'fun')],
    ['Avg hard (1–5)', avg_(fb, 'hard')],
    ['Version filter', verFilter || '(all versions)'],
    ['Dev runs left out', devRuns],
    ['Last updated', new Date()]
  ]);

  const diffs = count_(runs, 'difficulty').map(d => d[0]);
  add('By difficulty', ['Difficulty', 'Fights', 'Wins', 'Win %', 'Avg fight time (s)', 'Avg boss HP left on loss %', 'Avg fun', 'Avg hard'],
    diffs.map(d => {
      const rs = runs.filter(r => String(r.difficulty) === d);
      const w = rs.filter(r => r.result === 'win').length;
      const fs = fb.filter(f => String(f.difficulty) === d);
      return [d, rs.length, w, pct_(w, rs.length), avg_(rs, 'fightTime'),
        avg_(rs.filter(r => r.result === 'loss'), 'bossPctLeft'), avg_(fs, 'fun'), avg_(fs, 'hard')];
    }));

  add('Game speed chosen', ['Speed %', 'Fights'], count_(runs, 'speed'));
  add('Grammatical gender', ['Gender', 'Fights'], count_(runs, 'gender'));
  add('Pronouns', ['Pronouns', 'Fights'], count_(runs, 'pronouns'));
  add('Shared names?', ['namesShared', 'Fights'], count_(runs, 'namesShared'));
  add('Mature mode', ['Mature on?', 'Fights'], count_(runs, 'mature'));
  add('How fights ended', ['End', 'Fights'], count_(runs, 'endReason'));
  add('First ally down', ['Who', 'Fights'], count_(runs.filter(r => r.firstDownWho), 'firstDownWho'));
  add('What caused the first down', ['Attack', 'Fights'], count_(runs.filter(r => r.firstDownWho), 'firstDownBy'));
  add('First down: timing', ['Metric', 'Value'], [
    ['Fights with a down', runs.filter(r => r.firstDownWho).length],
    ['Avg time of first down (s)', avg_(runs, 'firstDownAt')],
    ['Avg healer mana at first down (%)', avg_(runs, 'firstDownManaPct')]
  ]);
  add('Nickname pack chosen', ['Pack', 'Fights'], count_(runs, 'nickPack'));
  add('Want more mature options?', ['Answer', 'Responses'], count_(fb.filter(f => f.wantMature !== '' && f.wantMature != null), 'wantMature'));

  const shared = runs.filter(r => r.namesShared === true || r.namesShared === 'TRUE');
  add('Healer names (top 15)', ['Name', 'Fights'], count_(shared, 'healerName').slice(0, 15));
  ['hale', 'vex', 'pell'].forEach(id => {
    const named = shared.filter(r => r['nick_' + id] !== '' && r['nick_' + id] != null);
    add(`Nicknames for ${id} (top 10)`, ['Nickname', 'Fights'], count_(named, 'nick_' + id).slice(0, 10));
  });
  add('Nickname set at all?', ['Ally', '% of fights with a nickname'], ['hale', 'vex', 'pell'].map(id => {
    const n = runs.filter(r => r['nickSet_' + id] === true || r['nickSet_' + id] === 'TRUE').length;
    return [id, runs.length ? pct_(n, runs.length) : ''];
  }));

  add('Ally outcomes', ['Ally', 'Happy', 'Fine', 'Unhappy', 'Defeated', 'Downed', 'Avg neglects', 'Avg low-HP time (s)'], ['hale', 'vex', 'pell'].map(id => {
    const c = v => runs.filter(r => r[id + '_verdict'] === v).length;
    return [id, c('great'), c('ok'), c('poor'), c('lost'), c('downed'), avg_(runs, id + '_neglects'), avg_(runs, id + '_lowTime')];
  }));

  const useKeys = runs.length ? Object.keys(runs[0]).filter(k => k.indexOf('use_') === 0) : [];
  add('Ability use (avg per fight)', ['Ability', 'Avg uses'],
    useKeys.map(k => [k.replace('use_', ''), avg_(runs, k)]).concat([
      ['line switches', avg_(runs, 'steps')], ['cancels', avg_(runs, 'cancels')],
      ['revive attempts', avg_(runs, 'reviveAttempts')], ['revive interrupts', avg_(runs, 'reviveInterrupts')],
      ['revives (successful)', avg_(runs, 'revives')]
    ]));

  // write blocks top to bottom
  let row = 1;
  blocks.forEach(b => {
    sh.getRange(row, 1).setValue(b.title).setFontWeight('bold').setFontSize(12);
    row++;
    if (b.header) {
      sh.getRange(row, 1, 1, b.header.length).setValues([b.header]).setFontWeight('bold').setBackground('#eeeeee');
      row++;
    }
    const width = Math.max.apply(null, b.rows.map(r => r.length));
    const padded = b.rows.map(r => r.concat(Array(width - r.length).fill('')));
    // Explicit formats so Sheets never re-reads counts as percentages (or text as numbers).
    const fmts = padded.map(r => r.map(v => v && typeof v === 'object' && 'pct' in v ? '0%'
      : v instanceof Date ? 'yyyy-mm-dd hh:mm' : typeof v === 'number' ? 'General' : '@'));
    const vals = padded.map(r => r.map(v => (v && typeof v === 'object' && 'pct' in v ? v.pct : v)));
    const rng = sh.getRange(row, 1, padded.length, width);
    rng.setNumberFormats(fmts);
    rng.setValues(vals);
    row += padded.length + 1;
  });
  sh.autoResizeColumns(1, 8);
}
