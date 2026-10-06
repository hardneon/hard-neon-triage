// Party: healer stats, shared rules, and allies with personality rules.
// Behaviour logic lives in game.js; every number it uses lives here.
// v0.5: all times rescaled so 100% game speed = the old 75% feel.
window.DATA = window.DATA || {};
DATA.party = {
  "healer": { "hp": 600, "mana": 1000, "manaRegen": 15, "gcd": 1.0, "startZone": "back" },

  "staminaRegen": 2.25,       // per second
  "exhaustBelow": 15,         // stamina below this = Exhausted (no abilities, reduced damage)
  "exhaustRecoverAt": 50,     // Exhausted ends when stamina reaches this
  "exhaustedDpsMult": 0.5,
  "lowHpAt": 0.35,            // "low HP" bark threshold
  "neglectBelow": 0.5,        // Neglected: below this HP fraction...
  "neglectAfter": 8,          // ...for this many seconds without a heal
  "neglectRebark": 8,         // seconds between repeated neglect barks (allies with repeatNeglectBark)
  "barkDuration": 4,          // seconds a speech bubble stays up
  "barkAllyGap": 4,           // min seconds between barks from the same ally
  "barkGlobalGap": 1.33,      // min seconds between low-priority barks from anyone
  "review": { "neglectPenalty": 15, "lowTimePenalty": 1.125, "downPenalty": 40, "great": 85, "ok": 60 },

  "allies": [
    {
      "id": "hale", "name": "Hale", "pronouns": "he", "role": "tank", "zone": "front",
      "hp": 1200, "stamina": 100, "dps": 15,
      "want": "dominance", "fear": "abandonment",
      "abilities": [
        { "id": "taunt",       "cost": 20, "cd": 10.7, "damage": 0 },
        { "id": "shield_slam", "cost": 30, "cd": 8,    "damage": 60 }
      ],
      "rules": {
        "callTarget":     { "interval": 26.7, "selfChance": 0.25, "duration": 6.7 },
        "neglectPenalty": { "dpsMult": 0.5 },
        "repeatNeglectBark": true
      }
    },
    {
      "id": "vex", "name": "Vex", "pronouns": "she", "role": "melee", "zone": "front",
      "hp": 700, "stamina": 100, "dps": 33.75,
      "want": "status", "fear": "stagnation",
      "abilities": [
        { "id": "flurry", "cost": 35, "cd": 5.3, "damage": 150, "critChance": 0.25, "critMult": 2 },
        { "id": "lunge",  "cost": 20, "cd": 6.7, "damage": 60 }
      ],
      "rules": {
        "greedyAfterCrit": { "attack": "cleave", "damageMult": 1.5 },
        "restless":        { "after": 6.7, "dpsMult": 1.2, "takenMult": 1.2 }
      }
    },
    {
      "id": "pell", "name": "Pell", "pronouns": "he", "role": "ranged", "zone": "back",
      "hp": 700, "stamina": 100, "dps": 26.25,
      "want": "stability", "fear": "humiliation",
      "abilities": [
        { "id": "firebolt", "cost": 25, "cd": 5.3, "damage": 100 }
      ],
      "rules": {
        "followHealer": { "delay": 2 },
        "blink":        { "cost": 15, "damageMult": 0.5 },
        "shaken":       { "below": 0.2, "duration": 13.3, "dpsMult": 0.7, "clearAbove": 0.5 }
      }
    }
  ]
};
