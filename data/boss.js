// Boss. Attack names live in strings.js (boss.attacks.<id>).
// hits: "single" picks one target from pool by weight; "zone" hits everyone in a zone when it lands.
// pool: "front" | "back" | "any". Weights per character id; missing = 0.
// modifiers (optional, added to weights): recentlyHealed, lowestHp, healer.
// v0.5: all times rescaled so 100% game speed = the old 75% feel.
// HP and damage here are Normal; difficulty multipliers live in settings.js.
window.DATA = window.DATA || {};
DATA.boss = {
  "id": "warden",
  "hp": 16000,
  "phase2At": 0.4,
  "targeting": { "recentlyHealedWindow": 4 },
  "barks": { "duration": 4, "cooldown": 6.7, "chance": { "attack_cleave": 0.6, "attack_seeker_bolt": 0.7 } },
  "attacks": [
    { "id": "pound", "hits": "single", "pool": "front", "interval": 2, "firstAt": 4, "telegraph": 0, "damage": 35,
      "weights": { "hale": 80, "vex": 20, "pell": 10, "healer": 25 } },

    { "id": "cleave", "hits": "zone", "zone": "front", "interval": 21.3, "intervalP2": 16, "firstAt": 16, "telegraph": 3.3, "damage": 150 },

    { "id": "crushing_blow", "hits": "single", "pool": "any", "interval": 37.3, "firstAt": 29.3, "telegraph": 5.3, "damage": 500,
      "weights": { "hale": 60, "vex": 25, "pell": 10, "healer": 5 } },

    { "id": "seeker_bolt", "hits": "single", "pool": "back", "interval": 26.7, "firstAt": 21.3, "telegraph": 2.0, "damage": 200,
      "weights": { "pell": 50, "healer": 50 },
      "modifiers": { "recentlyHealed": 40 } },

    { "id": "searing_ground", "hits": "zone", "zone": "front", "minPhase": 2, "interval": 29.3, "firstAt": 5.3, "telegraph": 2.7,
      "area": { "dps": 18.75, "duration": 8 } }
  ]
};
