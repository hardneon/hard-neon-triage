// Player settings defaults. Editable on the setup screen.
// gender = grammatical gender for barks: "feminine" | "masculine" | "neutral" (neutral uses the "other" branch).
window.DATA = window.DATA || {};
DATA.settings = {
  "version": "v0.12",

  "healerName": "Healer",
  "gender": "neutral",
  "pronouns": "they",
  "nicknames": { "hale": "", "vex": "", "pell": "" },
  "nickPack": "none",

  // Game speed: scales time only. 100 = intended pace.
  "speed": 100, "speedMin": 50, "speedMax": 150, "speedStep": 5,

  // Difficulty: scales the fight's numbers only, never time.
  "difficulty": "normal",
  "difficulties": {
    "story":  { "bossHp": 0.8, "bossDamage": 0.75, "reviveCd": 26.7 },
    "normal": { "bossHp": 1.0, "bossDamage": 1.0,  "reviveCd": 40 },
    "hard":   { "bossHp": 1.1, "bossDamage": 1.2,  "reviveCd": 40 },
    "brutal": { "bossHp": 1.2, "bossDamage": 1.4,  "reviveCd": 60 }
  },

  // Feedback form. Placeholders filled in: {version} {difficulty} {speed} {result} {time} {bossPct}
  // e.g. a Tally form with hidden fields: "https://tally.so/r/XXXX?version={version}&difficulty={difficulty}..."
  // Leave empty to hide the button ("Copy results" still works).
  "feedbackUrl": "",

  // Telemetry: Google Apps Script web-app URL (see telemetry/README.md). Empty = nothing is sent.
  "telemetryUrl": "https://script.google.com/macros/s/AKfycbzT6lZJursqFmufLUnzNi4iQyNi1rNfYEDKjmMw_rsOQCzSmlndX1L0hnQawr8l4755Yg/exec",

  // Support / follow link, shown on the setup and results screens. Empty = hidden.
  "supportUrl": "https://ko-fi.com/hardneon",

  "pronounSets": {
    "she":  { "subj": "she",  "obj": "her",  "poss": "her" },
    "he":   { "subj": "he",   "obj": "him",  "poss": "his" },
    "they": { "subj": "they", "obj": "them", "poss": "their" }
  },

  "targetKeys": { "F1": "healer", "F2": "hale", "F3": "vex", "F4": "pell" },
  "keys": { "cancel": "Escape", "pause": "KeyP" }
};
