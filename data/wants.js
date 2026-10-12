// Wants (v0.21): what fills an ally's Ultra meter. Shared with the Hard Neon personality system
// (Full Service IDs: connection, status, actualization, dominance, pleasure, stability).
// A Want is CONSCIOUS: the character asks for it and owns it. Players see an ally's Want from the start.
//
// Rules are generic so any new character can take any Want:
//   { "on": <event>, ... "gain": n }    event rules (fire when the event happens to this ally)
//   { "tick": true, <conditions>, "gain": n }   per-second rules (gain is per second while all conditions hold)
// Events: care (kind: heal | shield | invigorate | hot), overheal (amount), followed (you healed the target they called),
//         moment (they crit / landed a Signature or Ultra), sig_landed, hit_taken (amount, big), downed, targeted, neglected
// Optional on event rules: "kinds": [...], "within": "moment" (only during their moment window), "per": n (gain per n amount)
// Tick conditions: hpAbove, hpBelow, noSpikeFor (s since a big hit), active (not exhausted), taunting, hotActive,
//                  shielded, exhausted, uncaredFor (s since any care), sinceMomentAbove (s), inFire, withHealer (same line as you)
window.DATA = window.DATA || {};
DATA.wants = {
  "momentWindow": 4,     // seconds after a crit / Signature / Ultra that count as "their moment"
  "bigHit": 150,         // a hit at least this big is a "spike"
  "defs": {
    "connection":    { "gains": [ { "on": "care", "gain": 8 },
                                  { "tick": true, "withHealer": true, "gain": 0.4 } ] },
    "status":        { "gains": [ { "on": "care", "within": "moment", "gain": 16 },
                                  { "on": "care", "gain": 3 },
                                  { "on": "moment", "gain": 4 } ] },
    "actualization": { "gains": [ { "on": "sig_landed", "gain": 30 },
                                  { "tick": true, "active": true, "gain": 0.5 } ] },
    "dominance":     { "gains": [ { "on": "followed", "gain": 18 },
                                  { "on": "care", "kinds": ["heal"], "gain": 3 },
                                  { "tick": true, "taunting": true, "hpAbove": 0.7, "gain": 1.6 } ] },
    "pleasure":      { "gains": [ { "on": "overheal", "per": 100, "gain": 8 },
                                  { "on": "care", "kinds": ["hot"], "gain": 8 },
                                  { "tick": true, "hpAbove": 0.85, "gain": 1.0 } ] },
    "stability":     { "gains": [ { "on": "care", "kinds": ["shield"], "gain": 8 },
                                  { "tick": true, "hpAbove": 0.6, "noSpikeFor": 5, "gain": 1.4 } ] }
  }
};
