# Playtest telemetry setup (Google Sheets)

About 10 minutes. You need a Google account.

1. **Create a blank Google Sheet** (sheets.new). Name it e.g. "Triage playtests".
2. **Extensions → Apps Script.** Delete the starter code, paste in all of `Code.gs`, click Save.
3. **Run setup once:** choose `setup` in the function dropdown at the top, click **Run**.
   Google asks for permission — click through *Advanced → Go to (project) (unsafe)*. That warning
   appears for any personal script; it only touches this one sheet. Runs, Feedback and Summary tabs appear.
4. **Deploy:** Deploy → New deployment → gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click Deploy, copy the **Web app URL** (ends in `/exec`).
5. **Paste the URL** into `data/settings.js`:
   `"telemetryUrl": "https://script.google.com/macros/s/XXXX/exec",`
6. **Test:** open the URL in a browser — it should say "Triage telemetry is running."
   Then play one fight; a row should appear in **Runs** within a few seconds.

## If you change Code.gs later
Deploy → **Manage deployments** → edit (pencil) → Version: **New version** → Deploy.
This keeps the same URL. (A *new deployment* would give you a new URL.)

## Notes
- No player ID is stored. Each page load gets a random session ID kept in memory only, so you
  can see retries within one sitting.
- Names and nicknames are only sent if the player leaves "Include the healer name and nicknames"
  ticked. Otherwise only whether a nickname was set is recorded.
- The URL is public once the game is on GitHub, so anyone could post junk rows. Fine for a
  playtest; the script caps field counts and text length and stops text being read as formulas.
- To export: File → Download → CSV, or ask Claude to analyze the sheet.
