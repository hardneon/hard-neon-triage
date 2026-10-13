// Party: healer stats, shared rules, and allies with personality rules.
// Behaviour logic lives in game.js; every number it uses lives here.
// v0.5: all times rescaled so 100% game speed = the old 75% feel.
window.DATA = window.DATA || {};
DATA.party = {
  "healer": { "hp": 600, "mana": 1000, "manaRegen": 8, "gcd": 1.0, "startZone": "back",
              "role": "healer", "icon": "cross1", "portrait": "art/portraits/PT-Healer.png", "portraitFacing": "right" },

  // Portraits (v0.20): square images shown beside each frame. "portraitFacing" = the way the drawn face looks.
  // The game mirrors a portrait so it always faces into the screen (front column faces right, back column faces left).
  // Missing or broken images fall back to the role icon. Rim colour comes from the role, not the character.
  "roleColors": { "tank": "#2F5BFF", "melee": "#D23CFF", "ranged": "#7FE3FF", "healer": "#E8F4FF" },

  // v0.21: allies stay busy. Exhaustion only when truly empty, and short.
  // Each ally keeps a stamina reserve set by personality (rules.staminaReserve); Invigorate lets them spend it.
  "staminaRegen": 5,          // per second
  "exhaustBelow": 5,          // stamina below this after an ability = Exhausted (no abilities, reduced damage)
  "exhaustRecoverAt": 25,     // Exhausted ends when stamina reaches this
  "exhaustedDpsMult": 0.5,
  "invigorateSurge": true,    // Invigorate makes the ally act at once (ignores cooldown and reserve for one ability)

  // v0.21: Signatures and Ultras. "icon" = the burst shown over the boss when the move lands (icons.js). Wind-ups are interrupted by warned (telegraphed) attacks unless the ally is Warded.
  "windupInterruptBy": "telegraphed",
  "signatureInterruptCdFrac": 0.5,   // an interrupted Signature comes back after half its cooldown
  "ultraInterruptKeep": 0.5,         // an interrupted Ultra keeps half its meter
  "ultraMeterMax": 100,
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
      "id": "hale", "name": "Hale", "pronouns": "he", "role": "tank", "icon": "role_tank", "zone": "front",
      "portrait": "art/portraits/PT-Hale.png", "portraitFacing": "right",
      "hp": 1200, "stamina": 100, "dps": 15,
      "want": "dominance", "fear": "abandonment",
      "abilities": [
        { "id": "taunt",       "cost": 20, "cd": 10.7, "damage": 0,  "effect": "taunt", "duration": 5.3, "weightMult": 3 },
        { "id": "shield_slam", "cost": 30, "cd": 8,    "damage": 60, "effect": "guard", "duration": 4,   "takenMult": 0.7 }
      ],
      "signature": { "id": "bulwark", "tier": "signature", "targets": "party", "windup": 1.5, "cd": 28, "firstAt": 20,
                     "damage": 0, "effect": "party_guard", "duration": 6, "takenMult": 0.8, "icon": "shield" },
      "ultra":     { "id": "last_stand", "tier": "ultra", "targets": "party", "windup": 2.0, "timing": "onThreat", "maxWait": 8,
                     "damage": 150, "effect": "last_stand", "duration": 6, "takenMult": 0.3, "icon": "shield" },
      "rules": {
        "staminaReserve": 40,
        "callTarget":     { "interval": 26.7, "selfChance": 0.25, "duration": 6.7 },
        "repeatNeglectBark": true
      }
    },
    {
      "id": "vex", "name": "Vex", "pronouns": "she", "role": "melee", "icon": "role_melee", "zone": "front",
      "portrait": "art/portraits/PT-Vex.png", "portraitFacing": "right",
      "hp": 750, "stamina": 100, "dps": 33.75,
      "want": "status", "fear": "stagnation",
      "abilities": [
        { "id": "flurry", "cost": 35, "cd": 5.3, "damage": 180, "critChance": 0.3, "critMult": 2.5 },
        { "id": "lunge",  "cost": 20, "cd": 6.7, "damage": 70 }
      ],
      "signature": { "id": "overdrive", "tier": "signature", "targets": "single", "windup": 1.6, "cd": 24, "firstAt": 14,
                     "damage": 420, "critChance": 0.3, "critMult": 1.8, "icon": "slash" },
      "ultra":     { "id": "death_blossom", "tier": "ultra", "targets": "single", "windup": 2.6, "timing": "immediate",
                     "damage": 1300, "icon": "slash3" },
      "rules": {
        "staminaReserve": 10,   // all-in, but not quite empty; Reckless drops this to 0
        "greedyAfterCrit": { "attack": "cleave", "damageMult": 1.5 }
      }
    },
    {
      "id": "pell", "name": "Pell", "pronouns": "he", "role": "ranged", "icon": "role_ranged", "zone": "back",
      "portrait": "art/portraits/PT-Pell.png", "portraitFacing": "right",
      "hp": 700, "stamina": 100, "dps": 26.25,
      "want": "connection", "fear": "humiliation",
      "abilities": [
        { "id": "firebolt", "cost": 25, "cd": 5.3, "damage": 110, "cast": 1.3 }
      ],
      "signature": { "id": "inferno", "tier": "signature", "targets": "all_enemies", "windup": 2.0, "cd": 26, "firstAt": 17,
                     "damage": 260, "burn": { "dps": 22, "duration": 6 }, "icon": "flame" },
      "ultra":     { "id": "meteor", "tier": "ultra", "targets": "all_enemies", "windup": 3.0, "timing": "immediate",
                     "damage": 800, "burn": { "dps": 40, "duration": 8 }, "icon": "meteor" },
      "rules": {
        "staminaReserve": 20,
        "followHealer": { "delay": 2 },
        "blink":        { "cost": 15, "damageMult": 0.5 },
        "shaken":       { "below": 0.2, "duration": 13.3, "dpsMult": 0.7, "clearAbove": 0.5 }
      }
    }
  ]
};
