// Mature content layer (18+, opt-in on the setup screen). OFF by default.
// Line: suggestive nicknames, teasing and power dynamics. Nothing sexually explicit
// (keeps within GitHub's acceptable-use policy for an opt-in game).
// When enabled: these nickname packs are added to the picker, and these barks are ADDED to
// each trigger's pool (the base lines still appear too). Same ICU variables as strings.js.
window.DATA = window.DATA || {};
DATA.mature = {
  "nicknamePacks": [
    { "id": "spicy",     "nicknames": { "hale": "Pet",    "vex": "Toy",         "pell": "Angel" } },
    { "id": "bratty",    "nicknames": { "hale": "Brat",   "vex": "Cutie",       "pell": "{gender, select, feminine {Princess} masculine {Prince} other {Highness}}" } },
    { "id": "powerplay", "nicknames": { "hale": "Kitten", "vex": "Pretty thing", "pell": "{gender, select, feminine {Mistress} masculine {Master} other {Boss}}" } }
  ],

  // Only moments where the power dynamic IS the mechanic: being healed/shielded (care),
  // needing you (low HP, neglected), being brought back (revive), and judging you (verdicts).
  // Voices: Hale = calm, possessive dom (approval is the reward; never shouty).
  //         Vex  = flirty, lewd, bombastic show-off; feeds her ego (innuendo, never explicit).
  //         Pell = bratty sub: a pain on purpose to get your attention; dares you to put them in their place.
  "barks": {
    "hale": {
      "healed":           ["{gender, select, feminine {Good girl.} masculine {Good boy.} other {Good pet.}}", "That's it. Just like that."],
      "shielded":         ["Keeping me safe. I noticed."],
      "low_hp":           ["Eyes on me, {nickname}. You know what I need."],
      "neglected":        ["I'm waiting, {nickname}. Don't make me wait."],
      "revived":          ["You came for me. Good. Remember how that felt."],
      "review_great":     ["{gender, select, feminine {Good girl. You'll get your reward.} masculine {Good boy. You'll get your reward.} other {Good pet. You'll get your reward.}}", "You did exactly what I needed. Come here, {nickname}."],
      "review_poor":      ["We'll talk about where your attention was, {nickname}."],
      "review_lost":      ["Look at me. You'll do better for me next time."]
    },
    "vex": {
      "healed":           ["Ooh, right there! Again!", "Your hands are magic, {nickname}. Don't stop."],
      "shielded":         ["Wrapping me up? Kinky."],
      "low_hp":           ["Don't let this face get scuffed, {nickname}!"],
      "neglected":        ["Hello? Hot thing bleeding over here!"],
      "greedy":           ["Did you SEE that? You're blushing. I can tell."],
      "stamina_restored": ["Mmm, that's the stuff. I could go all night."],
      "revived":          ["Mouth-to-mouth next time, {nickname}."],
      "review_great":     ["You were incredible. Almost as incredible as me.", "Buy me a drink after this, {nickname}. You've earned the view."],
      "review_poor":      ["All this to look at, and you looked away? Rude."],
      "review_lost":      ["Next time, keep your eyes on me. I know it's not hard."]
    },
    "pell": {
      "healed":           ["Ugh, finally. I was getting bored.", "That's it? I'm not saying thank you."],
      "shielded":         ["I didn't ask for a bubble. …Fine. I'm keeping it."],
      "low_hp":           ["Oops. Guess you'll have to come fix me, {nickname}."],
      "neglected":        ["Ignoring me? Bold. I'll stand in the fire until you look.", "Hey. Hey. {nickname}. Hey."],
      "revived":          ["Took you long enough. Now pay attention to me."],
      "review_great":     ["Fine. You were good. Don't let it go to your head, {nickname}."],
      "review_poor":      ["That's it? I expected you to put me in my place."],
      "review_lost":      ["Your fault. Go on, punish me for it, {nickname}."]
    }
  }
};
