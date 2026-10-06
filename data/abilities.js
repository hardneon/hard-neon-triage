// Healer abilities. Names and descriptions live in strings.js (abilities.<id>).
// key = physical key code (event.code), so layouts like AZERTY still use the same physical keys.
// v0.5: all times rescaled so 100% game speed = the old 75% feel.
// Revive cooldown is set per difficulty (settings.js); "cd" here is the fallback.
window.DATA = window.DATA || {};
DATA.abilities = [
  { "id": "light_heal",      "key": "Digit1", "keyLabel": "1",   "type": "heal",     "cast": 0,   "mana": 60,  "amount": 120, "cd": 0,    "gcd": true,  "targeted": true },
  { "id": "med_heal",        "key": "Digit2", "keyLabel": "2",   "type": "heal",     "cast": 1.6, "mana": 50,  "amount": 200, "cd": 0,    "gcd": true,  "targeted": true },
  { "id": "heavy_heal",      "key": "Digit3", "keyLabel": "3",   "type": "heal",     "cast": 3.3, "mana": 120, "amount": 450, "cd": 0,    "gcd": true,  "targeted": true },
  { "id": "shield",          "key": "Digit4", "keyLabel": "4",   "type": "shield",   "cast": 0,   "mana": 80,  "amount": 150, "cd": 13.3, "gcd": true,  "targeted": true, "duration": 10.7 },
  { "id": "aoe_heal",        "key": "Digit5", "keyLabel": "5",   "type": "aoe_heal", "cast": 2.0, "mana": 300, "amount": 400, "cd": 16,   "gcd": true,  "targeted": false, "requiresZone": "front" },
  { "id": "stamina_restore", "key": "Digit6", "keyLabel": "6",   "type": "stamina",  "cast": 0,   "mana": 70,  "amount": 40,  "cd": 8,    "gcd": true,  "targeted": true, "allyOnly": true },
  { "id": "breathe",         "key": "Digit7", "keyLabel": "7",   "type": "breathe",  "cast": 0,   "mana": 0,   "cd": 0,    "gcd": false, "targeted": false, "windup": 1.33, "regenMult": 3 },
  { "id": "revive",          "key": "Digit8", "keyLabel": "8",   "type": "revive",   "cast": 4.7, "mana": 200, "amount": 0.5, "cd": 40,   "gcd": true,  "targeted": true, "allyOnly": true, "downedOnly": true, "interruptOnHit": true, "sameZone": true },
  { "id": "step",            "key": "Tab",    "keyLabel": "Tab", "type": "step",     "cast": 0,   "mana": 0,   "cd": 4,    "gcd": false, "targeted": false }
];
