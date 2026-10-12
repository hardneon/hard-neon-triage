// Fears (v0.21): pressure that builds, then the ally ACTS OUT. Same IDs as Hard Neon: Full Service
// (abandonment, humiliation, stagnation, helplessness, pain, risk).
// A Fear is REACTIVE and unconscious: the character never names it. Their lines deflect or rationalise.
// Players see WHAT they do (the behaviour tag), not why.
//
// "pressure" uses the same rule format as wants.js. When pressure reaches "threshold" the behaviour starts.
// Behaviour effects (all optional): dpsMult, takenMult, reserve (stamina reserve override), noAbilities,
//   noSignature, noUltra, ultraAt (fire the Ultra early at this meter), moveTo ("front"/"back"), aggroMult.
// "decay" on a fear overrides the shared decay. "calmBy": care kinds that end the behaviour early (after minDuration). "cooldown": seconds before it can trigger again.
window.DATA = window.DATA || {};
DATA.fears = {
  "threshold": 100,
  "decay": 2.5,          // pressure lost per second
  "minDuration": 2,      // behaviour lasts at least this long before care can calm it
  "cooldown": 20,
  "defs": {
    "abandonment":  { "behaviour": "attention",
                      "pressure": [ { "tick": true, "uncaredFor": 6, "hpBelow": 0.6, "gain": 7 },
                                    { "on": "neglected", "gain": 30 } ],
                      "effects": { "takenMult": 1.3, "aggroMult": 2 }, "duration": 8, "calmBy": ["heal", "shield"] },
    "humiliation":  { "behaviour": "sulk",
                      "pressure": [ { "on": "downed", "gain": 100 },
                                    { "on": "hit_taken", "big": true, "gain": 30 },
                                    { "on": "sig_interrupted", "gain": 45 },
                                    { "on": "ult_interrupted", "gain": 70 } ],
                      "effects": { "dpsMult": 0.6, "noAbilities": true }, "duration": 8, "calmBy": ["heal", "shield", "invigorate"] },
    "stagnation":   { "behaviour": "reckless", "decay": 1,   // stews: slower decay than the default
                      "pressure": [ { "tick": true, "exhausted": true, "gain": 9 },
                                    { "on": "sig_interrupted", "gain": 60 },
                                    { "on": "ult_interrupted", "gain": 90 },
                                    { "tick": true, "sinceMomentAbove": 25, "gain": 4 } ],
                      "effects": { "reserve": 0, "dpsMult": 1.3, "takenMult": 1.25, "ultraAt": 60 }, "duration": 10, "calmBy": ["invigorate"] },
    "helplessness": { "behaviour": "panic",
                      "pressure": [ { "tick": true, "exhausted": true, "hpBelow": 0.4, "gain": 12 },
                                    { "on": "downed", "gain": 60 } ],
                      "effects": { "moveTo": "back", "dpsMult": 0.5, "noAbilities": true }, "duration": 8, "calmBy": ["shield"] },
    "pain":         { "behaviour": "flinch",
                      "pressure": [ { "on": "hit_taken", "big": true, "gain": 30 },
                                    { "tick": true, "hpBelow": 0.35, "gain": 6 } ],
                      "effects": { "dpsMult": 0.7, "takenMult": 0.85 }, "duration": 6, "calmBy": ["heal"] },
    "risk":         { "behaviour": "freeze",
                      "pressure": [ { "on": "targeted", "gain": 25 },
                                    { "tick": true, "inFire": true, "gain": 12 },
                                    { "on": "ally_downed", "gain": 30 } ],
                      "effects": { "reserve": 60, "noSignature": true, "noUltra": true }, "duration": 8, "calmBy": ["shield"] }
  }
};
