// Nickname packs: one nickname per ally, in that ally's voice.
// Values may use ICU: {healerName}, {gender, select, feminine {...} masculine {...} other {...}}.
// Pack display names live in strings.js (ui.packs.<id>). Order here = order in the picker.
// "flag" (optional) is shown next to the pack name, e.g. a content note.
window.DATA = window.DATA || {};
DATA.nicknamePacks = [
  { "id": "none",         "nicknames": { "hale": "",           "vex": "",         "pell": "" } },
  { "id": "professional", "nicknames": { "hale": "Medic",      "vex": "Healer",   "pell": "Doc" } },
  { "id": "friendly",     "nicknames": { "hale": "Kid",        "vex": "Sunshine", "pell": "Friend" } },
  { "id": "teasing",      "nicknames": { "hale": "Rookie",     "vex": "Bandage",  "pell": "Patches" } },
  { "id": "affectionate", "nicknames": { "hale": "Sweetheart", "vex": "Gorgeous", "pell": "Dear" } },
  { "id": "spicy",        "flag": "suggestive", "nicknames": { "hale": "Pet", "vex": "Toy", "pell": "Angel" } }
];
