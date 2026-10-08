// Healer Prototype v0.1 — logic only. All numbers in data/*.js, all text in data/strings.js.
(() => {
  'use strict';
  const D = window.DATA;
  const AB = Object.fromEntries(D.abilities.map(a => [a.id, a]));
  const KEY_TO_AB = Object.fromEntries(D.abilities.map(a => [a.key, a.id]));

  // ---------- helpers ----------
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  // Always pass a real boolean: classList.toggle(name, undefined) FLIPS the class every call,
  // which made buttons flash every frame (a photosensitivity hazard).
  const setCls = (e, c, on) => e.classList.toggle(c, !!on);
  const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const pct = c => c.hp / c.maxHp;
  const fmtS = n => n.toFixed(1);

  // ICU MessageFormat subset: {var} and {var, select, key {text} other {text}}, nestable.
  function fmt(msg, vars) {
    let i = 0;
    const readUntil = chars => { let s = ''; while (i < msg.length && !chars.includes(msg[i])) s += msg[i++]; return s.trim(); };
    const skipWs = () => { while (i < msg.length && /\s/.test(msg[i])) i++; };
    function parseText(inBranch) {
      let out = '';
      while (i < msg.length) {
        const c = msg[i];
        if (c === '{') { i++; out += parseArg(); }
        else if (c === '}') { if (inBranch) return out; i++; }
        else { out += c; i++; }
      }
      return out;
    }
    function parseArg() {
      const name = readUntil(',}');
      if (msg[i] === '}') { i++; const v = vars[name]; return v == null ? '' : String(v); }
      i++; // ,
      readUntil(',}'); // type (only "select" supported)
      i++; // ,
      const val = String(vars[name] ?? 'other');
      let chosen = null, other = '';
      while (i < msg.length) {
        skipWs();
        if (msg[i] === '}') { i++; break; }
        const key = readUntil('{'); i++;
        const text = parseText(true); i++;
        if (key === val) chosen = text;
        if (key === 'other') other = text;
      }
      return chosen ?? other;
    }
    return parseText(false);
  }

  function baseVars() {
    const st = D.settings;
    const p = st.pronounSets[st.pronouns] || st.pronounSets.they;
    return { healerName: st.healerName || 'Healer', gender: st.gender, subj: p.subj, obj: p.obj, poss: p.poss };
  }
  // A trigger's bark pool: base lines, plus mature lines when the 18+ mode is on.
  function barkPool(id, trigger) {
    const base = D.strings.barks[id]?.[trigger] || [];
    const extra = D.settings.mature ? (D.mature?.barks?.[id]?.[trigger] || []) : [];
    return base.concat(extra);
  }
  function nicknamePacks() {
    const base = D.nicknamePacks || [];
    if (!D.settings.mature) return base;
    return base.concat((D.mature?.nicknamePacks || []).map(p => ({ ...p, flag: 'mature' })));
  }
  function str(path, vars = {}) {
    const v = path.split('.').reduce((o, k) => (o == null ? o : o[k]), D.strings);
    if (v == null) return `[${path}]`;
    return fmt(v, { ...baseVars(), ...vars });
  }
  const abName = id => str(`abilities.${id}.name`);
  const atkName = id => str(`boss.attacks.${id}`);
  const zoneName = z => str(`zone.${z}`);

  // ---------- state ----------
  let S = null;

  function newFight() {
    const st = D.settings, h = D.party.healer;
    S = {
      t: 0, over: false, paused: false, result: null,
      target: 'hale', msg: null, called: null,
      chars: {}, order: ['healer', ...D.party.allies.map(a => a.id)],
      stats: { healed: 0, overheal: 0, manaSpent: 0, casts: 0, cancels: 0, byAbility: {}, steps: 0, reviveAttempts: 0, reviveInterrupts: 0, revives: 0 },
      globalBarkEnd: 0, scheduled: [], log: []
    };
    S.healer = S.chars.healer = {
      id: 'healer', isHealer: true, name: st.healerName || 'Healer', maxHp: h.hp, hp: h.hp, zone: h.startZone,
      shield: 0, shieldEnd: 0, down: false, mana: h.mana, maxMana: h.mana, gcdEnd: 0, cast: null, cds: {},
      breathe: null, lastHealedAt: -99, lowSince: null
    };
    for (const a of D.party.allies) {
      S.chars[a.id] = {
        ...a, rules: a.rules || {}, maxHp: a.hp, hp: a.hp, maxStamina: a.stamina, stamina: a.stamina,
        shield: 0, shieldEnd: 0, down: false, abCds: {}, exhausted: false, exhaustedSince: null,
        restless: false, greedy: false, shakenEnd: 0, neglected: false, nextNeglectBark: 0,
        lastHealedAt: -99, lowSince: null, barkCd: 0, lastBark: {}, caption: null, captionEnd: 0,
        rv: { neglects: 0, lowTime: 0, downs: 0, revives: 0 },
        followAt: null, nextCall: a.rules?.callTarget?.interval ?? Infinity, action: null, actionEnd: 0, curDps: a.dps
      };
    }
    const B = D.boss;
    TEL.runIndex++;
    S.run = { version: st.version, difficulty: st.difficulty, speed: st.speed, mature: !!st.mature, runIndex: TEL.runIndex, runId: `${TEL.sessionId}-${TEL.runIndex}`, startedAt: new Date().toISOString() };
    S.diff = st.difficulties[st.difficulty] || st.difficulties.normal;
    const bossHp = Math.round(B.hp * S.diff.bossHp);
    S.boss = { hp: bossHp, maxHp: bossHp, phase: 1, timers: {}, telegraphs: [], areas: [], caption: null, captionEnd: 0, barkCd: 0, lastBark: {} };
    for (const a of B.attacks) S.boss.timers[a.id] = (a.minPhase || 1) === 1 ? a.firstAt : Infinity;
    S.scheduled.push({ at: 0.1, fn: () => bossBark('fight_start') });
    D.party.allies.forEach((a, i) => S.scheduled.push({ at: 2.1 + i * 1.9, fn: () => bark(a.id, 'fight_start', {}, 1) }));
    log(str('log.fightStart'), 'sys');
  }

  const allies = () => D.party.allies.map(a => S.chars[a.id]);
  const living = () => S.order.map(id => S.chars[id]).filter(c => !c.down);

  // ---------- log, notices, barks ----------
  function log(text, kind = '') {
    S.log.push({ t: S.t, text, kind });
    if (S.log.length > 80) S.log.shift();
    S.logDirty = true;
  }
  function notify(text) { S.msg = { text, end: performance.now() + 1200 }; }

  // priority: 0 normal (respects global 1s gap), 1+ bypasses global gap. Per-ally 3s gap always applies unless force.
  function bark(id, trigger, extra = {}, priority = 0, force = false) {
    const a = S.chars[id];
    if (!a || a.isHealer || (a.down && !force)) return;
    const list = barkPool(id, trigger);
    if (!list || !list.length) return;
    if (!force && S.t < a.barkCd) return;
    if (!force && priority < 1 && S.t < S.globalBarkEnd) return;
    let idx = Math.floor(Math.random() * list.length);
    if (list.length > 1 && idx === a.lastBark[trigger]) idx = (idx + 1) % list.length;
    a.lastBark[trigger] = idx;
    const nick = D.settings.nicknames[id] || D.settings.healerName || 'Healer';
    const text = cap(fmt(list[idx], { ...baseVars(), nickname: nick, ...extra }));
    a.caption = text; a.captionEnd = S.t + D.party.barkDuration; a.barkCd = S.t + D.party.barkAllyGap; S.globalBarkEnd = S.t + D.party.barkGlobalGap;
    log(`${a.name}: “${text}”`, 'bark');
  }

  // Boss shouts: own cooldown, never blocked by the party's global gap.
  function bossBark(trigger, extra = {}, force = false) {
    const B = S.boss, cfg = D.boss.barks || {};
    const list = barkPool('boss', trigger);
    if (!list || !list.length) return;
    if (!force && S.t < B.barkCd) return;
    if (!force && Math.random() > (cfg.chance?.[trigger] ?? 1)) return;
    let idx = Math.floor(Math.random() * list.length);
    if (list.length > 1 && idx === B.lastBark[trigger]) idx = (idx + 1) % list.length;
    B.lastBark[trigger] = idx;
    const text = cap(fmt(list[idx], { ...baseVars(), ...extra }));
    B.caption = text; B.captionEnd = S.t + (cfg.duration ?? 3); B.barkCd = S.t + (cfg.cooldown ?? 4);
    log(`${str('boss.name')}: “${text}”`, 'bark');
  }

  // ---------- combat core ----------
  function damage(c, amt, opts = {}) {
    if (c.down || amt <= 0) return;
    if (c.isHealer && c.breathe) c.breathe = null; // any hit breaks Breathe
    if (c.isHealer && c.cast && c.cast.ab?.interruptOnHit) {
      if (c.cast.ab.type === 'revive') S.stats.reviveInterrupts++;
      log(str('log.interrupted', { ability: abName(c.cast.ab.id) }), 'bad');
      notify(str('log.interrupted', { ability: abName(c.cast.ab.id) }));
      c.cast = null; S.stats.cancels++;
    }
    let m = 1;
    if (c.restless) m *= c.rules.restless.takenMult;
    if (c.guardEnd > S.t) m *= c.guardMult;
    if (c.greedy && opts.attackId === c.rules.greedyAfterCrit?.attack) { m *= c.rules.greedyAfterCrit.damageMult; c.greedy = false; }
    amt *= m;
    if (c.shield > 0) { const ab = Math.min(c.shield, amt); c.shield -= ab; amt -= ab; }
    const before = pct(c);
    c.hp -= amt;
    if (!opts.silent && amt > 0) c.hitText = { text: `-${Math.round(amt)}`, end: S.t + 0.9 };
    if (c.hp <= 0) {
      c.hp = 0; c.down = true; c.shield = 0;
      log(str('log.down', { name: c.name }), 'bad');
      if (c.rv) c.rv.downs++;
      bossBark(c.isHealer ? 'healer_downed' : 'ally_downed', { who: c.name }, true);
      if (c.isHealer) c.cast = null;
      c.casting = null;
      for (const o of allies()) if (o !== c && !o.down) { bark(o.id, 'ally_downed', { who: c.name }, 2); break; }
      return;
    }
    const after = pct(c);
    if (before >= D.party.lowHpAt && after < D.party.lowHpAt) bark(c.id, 'low_hp', {}, 2);
    if (after < D.party.neglectBelow && c.lowSince == null) c.lowSince = S.t;
    const sh = c.rules?.shaken;
    if (sh && after < sh.below && c.shakenEnd <= S.t) { c.shakenEnd = S.t + sh.duration; bark(c.id, 'shaken', {}, 2); }
  }

  function heal(c, amt) {
    if (c.down) return;
    const eff = Math.min(amt, c.maxHp - c.hp);
    c.hp += eff;
    S.stats.healed += eff; S.stats.overheal += amt - eff;
    const wasLow = c.lowSince != null;
    c.lastHealedAt = S.t;
    c.lowSince = pct(c) < D.party.neglectBelow ? S.t : null;
    c.neglected = false;
    const sh = c.rules?.shaken;
    if (sh && c.shakenEnd > S.t && pct(c) >= sh.clearAbove) c.shakenEnd = 0;
    c.healText = { text: `+${Math.round(eff)}`, end: S.t + 0.9 };
    if (wasLow && Math.random() < 0.6) bark(c.id, 'healed');
  }

  function revive(c, frac) {
    S.stats.revives++;
    Object.assign(c, {
      down: false, hp: Math.round(c.maxHp * frac), shield: 0, exhausted: false, restless: false, greedy: false,
      shakenEnd: 0, neglected: false, lowSince: S.t, lastHealedAt: S.t, followAt: null
    });
    c.stamina = Math.max(c.stamina, D.party.exhaustRecoverAt);
    if (c.rules?.followHealer) c.zone = S.healer.zone;
    log(str('log.revived', { name: c.name }), 'good');
    c.rv.revives++;
    bark(c.id, 'revived', {}, 2, true);
  }

  // ---------- healer actions ----------
  function tryCast(id) {
    if (!S || S.over || S.paused) return;
    const h = S.healer, ab = AB[id];
    if (h.down) return;
    if ((h.cds[id] || 0) > S.t) return notify(str('ui.onCooldown', { ability: abName(id) }));
    if (ab.type === 'step') return doStep();
    if (h.breathe) { h.breathe = null; if (ab.type === 'breathe') return; } // pressing Breathe again stops it
    if (h.cast && h.cast.ab.id === id && (ab.downedOnly || h.cast.targetId === (ab.targeted ? S.target : null))) return; // already casting this
    if (ab.gcd && S.t < h.gcdEnd) return notify(str('ui.onGcd'));
    if (h.mana < ab.mana) return notify(str('ui.noMana'));
    if (ab.requiresZone && h.zone !== ab.requiresZone) return notify(str('ui.needsZone', { ability: abName(id), zone: zoneName(ab.requiresZone) }));
    let targetId = null;
    if (ab.targeted) {
      targetId = S.target;
      if (ab.downedOnly && !S.chars[targetId]?.down) {
        // auto-target: a downed ally in your line first, then any downed ally
        const downed = allies().filter(c => c.down);
        const pick = downed.find(c => c.zone === S.healer.zone) || downed[0];
        if (pick) targetId = pick.id;
      }
      const tg = S.chars[targetId];
      if (!tg) return notify(str('ui.noTarget'));
      if (ab.allyOnly && tg.isHealer) return notify(str('ui.allyOnly', { ability: abName(id) }));
      if (ab.downedOnly && !tg.down) return notify(str('ui.needsDowned', { ability: abName(id) }));
      if (!ab.downedOnly && tg.down) return notify(AB.revive ? str('ui.notDowned', { ability: abName('revive') }) : str('ui.targetDown'));
      if (ab.sameZone && tg.zone !== h.zone) return notify(str('ui.needsSameZone', { ability: abName(id), target: tg.name, zone: zoneName(tg.zone) }));
    }
    // last input wins: a valid new ability replaces the current cast
    if (h.cast) { h.cast = null; S.stats.cancels++; }
    if (ab.gcd) h.gcdEnd = S.t + D.party.healer.gcd;
    if (ab.type === 'revive') S.stats.reviveAttempts++;
    if (ab.cast > 0) h.cast = { ab, targetId, start: S.t, end: S.t + ab.cast };
    else resolve(ab, targetId);
  }

  function resolve(ab, targetId) {
    const h = S.healer, tg = targetId ? S.chars[targetId] : null;
    if (tg && tg.down !== !!ab.downedOnly) return notify(str('ui.targetDown'));
    if (h.mana < ab.mana) return notify(str('ui.noMana'));
    if (ab.requiresZone && h.zone !== ab.requiresZone) return notify(str('ui.needsZone', { ability: abName(ab.id), zone: zoneName(ab.requiresZone) }));
    if (ab.sameZone && tg && tg.zone !== h.zone) return notify(str('ui.needsSameZone', { ability: abName(ab.id), target: tg.name, zone: zoneName(tg.zone) }));
    h.mana -= ab.mana; S.stats.manaSpent += ab.mana; S.stats.casts++;
    S.stats.byAbility[ab.id] = (S.stats.byAbility[ab.id] || 0) + 1;
    const cd = ab.type === 'revive' ? (S.diff.reviveCd ?? ab.cd) : ab.cd;
    if (cd) h.cds[ab.id] = S.t + cd;
    switch (ab.type) {
      case 'heal': heal(tg, ab.amount); break;
      case 'shield': tg.shield = ab.amount; tg.shieldEnd = S.t + ab.duration; bark(tg.id, 'shielded'); break;
      case 'aoe_heal': for (const c of living()) if (c.zone === h.zone) heal(c, ab.amount); break;
      case 'stamina':
        tg.stamina = Math.min(tg.maxStamina, tg.stamina + ab.amount);
        if (tg.exhausted && tg.stamina >= D.party.exhaustRecoverAt) tg.exhausted = false;
        tg.restless = false;
        bark(tg.id, 'stamina_restored');
        break;
      case 'breathe': h.breathe = { start: S.t }; break;
      case 'revive': revive(tg, ab.amount); break;
    }
  }

  // Step is instant; its cost is a cooldown. Moving cancels any cast.
  function doStep() {
    const h = S.healer;
    S.stats.steps++;
    if (h.cast) { h.cast = null; S.stats.cancels++; }
    h.breathe = null;
    if (AB.step.cd) h.cds.step = S.t + AB.step.cd;
    completeStep();
  }

  function completeStep() {
    const h = S.healer;
    h.zone = h.zone === 'front' ? 'back' : 'front';
    log(str('log.step', { name: h.name, zone: zoneName(h.zone) }), 'sys');
    for (const a of allies()) {
      if (!a.down && a.rules.followHealer && a.zone !== h.zone && a.followAt == null) {
        a.followAt = S.t + a.rules.followHealer.delay;
        bark(a.id, 'follows', {}, 1);
      }
    }
  }

  function cancelCast() {
    const h = S?.healer;
    if (!h) return;
    if (h.breathe) h.breathe = null;
    if (h.cast) { h.cast = null; S.stats.cancels++; log(str('log.cancel'), 'sys'); }
  }

  // ---------- updates ----------
  function updateHealer(dt) {
    const h = S.healer;
    if (h.down) return;
    let regen = D.party.healer.manaRegen;
    if (h.breathe && S.t - h.breathe.start >= AB.breathe.windup) regen *= AB.breathe.regenMult;
    h.mana = Math.min(h.maxMana, h.mana + regen * dt);
    if (h.cast && S.t >= h.cast.end) {
      const c = h.cast; h.cast = null;
      resolve(c.ab, c.targetId);
    }
  }

  function allyDamageMult(a) {
    let m = 1;
    if (a.neglected && a.rules.neglectPenalty) m *= a.rules.neglectPenalty.dpsMult;
    if (a.restless) m *= a.rules.restless.dpsMult;
    if (a.shakenEnd > S.t) m *= a.rules.shaken.dpsMult;
    return m;
  }

  function updateAllies(dt) {
    const P = D.party;
    for (const a of allies()) {
      if (a.down) continue;
      if (pct(a) < P.lowHpAt) a.rv.lowTime += dt;
      // stamina & exhaustion
      a.stamina = Math.min(a.maxStamina, a.stamina + P.staminaRegen * dt);
      if (a.exhausted && a.stamina >= P.exhaustRecoverAt) a.exhausted = false;
      const rs = a.rules.restless;
      if (rs && a.exhausted && !a.restless && S.t - a.exhaustedSince >= rs.after) { a.restless = true; bark(a.id, 'restless', {}, 1); }
      // abilities (first ready one, in listed order)
      if (a.casting) {
        if (S.t >= a.casting.end) { const ab = a.casting.ab; a.casting = null; finishAllyAbility(a, ab); }
      } else if (!a.exhausted) {
        for (const ab of a.abilities) {
          if (a.stamina >= ab.cost && (a.abCds[ab.id] || 0) <= S.t) { useAllyAbility(a, ab); break; }
        }
      }
      // sustained damage
      let dps = a.dps * allyDamageMult(a);
      if (a.exhausted) dps *= P.exhaustedDpsMult;
      a.curDps = dps;
      S.boss.hp -= dps * dt;
      // neglect
      if (a.lowSince != null && pct(a) < P.neglectBelow && S.t - a.lowSince >= P.neglectAfter) {
        if (!a.neglected) { a.neglected = true; a.rv.neglects++; a.nextNeglectBark = S.t + P.neglectRebark; bark(a.id, 'neglected', {}, 1); }
        else if (a.rules.repeatNeglectBark && S.t >= a.nextNeglectBark) { a.nextNeglectBark = S.t + P.neglectRebark; bark(a.id, 'neglected', {}, 1); }
      }
      // Hale: call targets
      const ct = a.rules.callTarget;
      if (ct && S.t >= a.nextCall) {
        a.nextCall = S.t + ct.interval;
        const cands = living();
        let pick = Math.random() < ct.selfChance ? a : cands.reduce((m, c) => (pct(c) < pct(m) ? c : m), cands[0]);
        S.called = { id: pick.id, end: S.t + ct.duration };
        bark(a.id, 'calls_target', { target: pick.name, who: pick === a ? 'self' : pick.isHealer ? 'healer' : 'other' }, 1);
      }
      // Pell: follow healer
      if (a.followAt != null && S.t >= a.followAt) {
        a.followAt = null;
        if (a.zone !== S.healer.zone) { a.zone = S.healer.zone; log(str('log.follow', { name: a.name, zone: zoneName(a.zone) }), 'sys'); }
      }
    }
  }

  function useAllyAbility(a, ab) {
    a.stamina -= ab.cost;
    a.abCds[ab.id] = S.t + ab.cd;
    if (ab.cast) {
      // cast-time ability: slowed by being Shaken
      const slow = a.shakenEnd > S.t ? a.rules.shaken.dpsMult : 1;
      a.casting = { ab, end: S.t + ab.cast / slow };
      return;
    }
    finishAllyAbility(a, ab);
  }

  function finishAllyAbility(a, ab) {
    if (ab.effect === 'taunt') S.taunt = { id: a.id, end: S.t + ab.duration, mult: ab.weightMult };
    if (ab.effect === 'guard') { a.guardEnd = S.t + ab.duration; a.guardMult = ab.takenMult; }
    let dmg = ab.damage * allyDamageMult(a);
    let crit = false;
    if (ab.critChance && Math.random() < ab.critChance) { dmg *= ab.critMult; crit = true; }
    S.boss.hp -= dmg;
    a.action = str(`allyAbilities.${ab.id}`) + (crit ? ` — ${str('status.crit')}` : '');
    a.actionEnd = S.t + 1.5;
    if (crit && a.rules.greedyAfterCrit && !a.greedy) { a.greedy = true; bark(a.id, 'greedy', {}, 1); }
    if (a.stamina < D.party.exhaustBelow) {
      a.exhausted = true; a.exhaustedSince = S.t;
      bark(a.id, 'out_of_stamina');
    }
  }

  function pickTarget(atk) {
    const B = D.boss;
    const cands = living().filter(c => atk.pool === 'any' || c.zone === atk.pool);
    if (!cands.length) return null;
    const mods = atk.modifiers || {};
    const lowest = cands.reduce((m, c) => (pct(c) < pct(m) ? c : m), cands[0]);
    const w = cands.map(c => {
      let x = atk.weights?.[c.id] ?? 0;
      if (mods.recentlyHealed && S.t - c.lastHealedAt <= B.targeting.recentlyHealedWindow) x += mods.recentlyHealed;
      if (mods.lowestHp && c === lowest) x += mods.lowestHp;
      if (mods.healer && c.isHealer) x += mods.healer;
      if (S.taunt && S.taunt.end > S.t && S.taunt.id === c.id) x *= S.taunt.mult;
      return x;
    });
    const total = w.reduce((s, x) => s + x, 0);
    if (total <= 0) return cands[Math.floor(Math.random() * cands.length)].id;
    let r = Math.random() * total;
    for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r <= 0) return cands[i].id; }
    return cands[cands.length - 1].id;
  }

  function beginAttack(atk) {
    const tg = { atk, end: S.t + (atk.telegraph || 0), targetId: null, blinked: false };
    if (atk.hits === 'single') {
      tg.targetId = pickTarget(atk);
      if (!tg.targetId) return;
    }
    if (!atk.telegraph) return resolveAttack(tg);
    S.boss.telegraphs.push(tg);
    const name = atkName(atk.id);
    if (atk.hits === 'single') {
      const c = S.chars[tg.targetId];
      if (c.isHealer) bossBark('targets_healer', { attack: name });
      else bossBark(`attack_${atk.id}`, { target: c.name, attack: name });
      log(str('log.telegraph', { attack: name, target: c.name }), 'warn');
      const bl = c.rules?.blink;
      if (bl && c.stamina >= bl.cost && !c.exhausted) { c.stamina -= bl.cost; tg.blinked = true; bark(c.id, 'blink', {}, 2); }
      else bark(c.id, 'targeted', { attack: name }, 2);
    } else {
      log(str('log.telegraph', { attack: name, target: zoneName(atk.zone) }), 'warn');
      bossBark(`attack_${atk.id}`, { attack: name });
      bark('hale', 'telegraph', { attack: name }, 2);
    }
  }

  function resolveAttack(tg) {
    const atk = tg.atk;
    if (atk.hits === 'single') {
      const c = S.chars[tg.targetId];
      if (!c || c.down) return;
      let dmg = atk.damage * S.diff.bossDamage;
      if (tg.blinked) dmg *= c.rules.blink.damageMult;
      damage(c, dmg, { attackId: atk.id });
    } else if (atk.area) {
      S.boss.areas.push({ zone: atk.zone, dps: atk.area.dps * S.diff.bossDamage, end: S.t + atk.area.duration, attackId: atk.id });
      log(str('log.areaStart', { attack: atkName(atk.id), zone: zoneName(atk.zone) }), 'warn');
    } else {
      for (const c of living()) if (c.zone === atk.zone) damage(c, atk.damage * S.diff.bossDamage, { attackId: atk.id });
    }
  }

  function updateBoss(dt) {
    const B = S.boss, cfg = D.boss;
    if (B.phase === 1 && B.hp / B.maxHp <= cfg.phase2At) {
      B.phase = 2;
      log(str('log.phase2'), 'warn');
      for (const a of cfg.attacks) if ((a.minPhase || 1) === 2) B.timers[a.id] = S.t + a.firstAt;
      bossBark('phase_change', {}, true);
      S.scheduled.push({ at: S.t + 2.7, fn: () => bark('hale', 'phase_change', {}, 1) });
    }
    for (const a of cfg.attacks) {
      if ((a.minPhase || 1) > B.phase) continue;
      if (S.t >= B.timers[a.id]) {
        B.timers[a.id] = S.t + (B.phase === 2 && a.intervalP2 ? a.intervalP2 : a.interval);
        beginAttack(a);
      }
    }
    for (const tg of B.telegraphs.slice()) {
      if (S.t >= tg.end) { B.telegraphs.splice(B.telegraphs.indexOf(tg), 1); resolveAttack(tg); }
    }
    B.areas = B.areas.filter(ar => ar.end > S.t);
    for (const ar of B.areas) for (const c of living()) if (c.zone === ar.zone) damage(c, ar.dps * dt, { attackId: ar.attackId, silent: true });
  }

  function updateMisc() {
    for (const c of Object.values(S.chars)) if (c.shield > 0 && S.t >= c.shieldEnd) c.shield = 0;
    for (const s of S.scheduled.slice()) if (S.t >= s.at) { S.scheduled.splice(S.scheduled.indexOf(s), 1); s.fn(); }
  }

  function checkEnd() {
    if (S.boss.hp <= 0) { S.boss.hp = 0; return endFight(true); }
    if (S.healer.down || allies().every(a => a.down)) endFight(false);
  }

  // Post-fight verdict per ally. Weights and thresholds in allies.js (party.review).
  function verdict(a) {
    const R = D.party.review;
    if (S.stats.casts === 0) return a.down ? 'downed' : 'poor'; // did nothing at all
    if (a.down) return 'downed';
    if (!S.result) return 'lost';                                // nobody is happy after a wipe
    let score = 100 - a.rv.neglects * R.neglectPenalty - a.rv.lowTime * R.lowTimePenalty - a.rv.downs * R.downPenalty;
    if (score >= R.great) return 'great';
    if (score >= R.ok) return 'ok';
    return 'poor';
  }
  function sayLine(id, trigger) {
    const list = barkPool(id, trigger);
    if (!list || !list.length) return '';
    const nick = D.settings.nicknames[id] || D.settings.healerName || 'Healer';
    return cap(fmt(list[Math.floor(Math.random() * list.length)], { ...baseVars(), nickname: nick }));
  }

  function endFight(win) {
    S.over = true; S.result = win;
    log(str(win ? 'log.win' : 'log.lose'), win ? 'good' : 'bad');
    bossBark(win ? 'defeated' : 'victory', {}, true);
    for (const a of allies()) {
      const v = verdict(a);
      a.verdict = v;
      a.verdictLine = sayLine(a.id, `review_${v}`);
      a.caption = a.verdictLine; a.captionEnd = Infinity;
    }
    sendRun();
    showResult();
  }

  function step(dt) {
    S.t += dt;
    updateMisc();
    updateHealer(dt);
    updateAllies(dt);
    updateBoss(dt);
    checkEnd();
  }

  // ---------- UI ----------
  const ui = {};

  function bar(cls) {
    const b = el('div', `bar ${cls}`);
    const f = el('div', 'fill'); const t = el('div', 'bartext');
    b.append(f, t); b._fill = f; b._text = t;
    return b;
  }
  function setBar(b, frac, text) {
    b._fill.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
    b._text.textContent = text;
  }

  function buildUI() {
    $('#bossName').textContent = str('boss.name');
    ui.bossHp = bar('boss'); $('#bossHp').replaceChildren(ui.bossHp);
    $('#frontTitle').textContent = str('ui.frontLine');
    $('#backTitle').textContent = str('ui.backLine');
    $('#controls').textContent = str('ui.controls');
    $('#logTitle').textContent = str('ui.log');
    $('#pauseOverlay p').textContent = str('ui.paused');
    ui.frames = {};
    $('#frontList').replaceChildren(); $('#backList').replaceChildren();
    S.order.forEach((id, i) => {
      const c = S.chars[id];
      const f = el('button', 'frame'); f.type = 'button'; f.dataset.id = id;
      const head = el('div', 'fhead');
      const nm = el('span', 'fname', c.name);
      const ci = D.icons?.[c.icon];
      if (ci) { const s = el('span', 'ficon'); s.title = str(`ui.classes.${c.role}`);
        s.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${ci.color}">${ci.svg}</svg>`; head.append(s); }
      const key = el('span', 'fkey', Object.keys(D.settings.targetKeys).find(k => D.settings.targetKeys[k] === id) || '');
      const tgt = el('span', 'ftarget', '');
      head.append(nm, key, tgt);
      const hp = bar('hp');
      const warn = bar('warn'); warn.hidden = true;
      f.append(head, warn, hp);
      let st = null;
      if (!c.isHealer) { st = bar('st'); f.append(st); }
      const status = el('div', 'fstatus'); const act = el('div', 'faction'); const cap_ = el('div', 'bubble');
      const flo = el('div', 'ffloat');
      f.append(status, act, cap_, flo);
      f.addEventListener('click', () => { S.target = id; });
      ui.frames[id] = { f, hp, st, warn, status, act, cap: cap_, flo, tgt, zone: null };
    });
    ui.mana = bar('mana'); $('#mana').replaceChildren(ui.mana);
    ui.cast = bar('cast'); $('#cast').replaceChildren(ui.cast);
    ui.gcd = bar('gcd'); $('#gcd').replaceChildren(ui.gcd);
    const abBox = $('#abilities'); abBox.replaceChildren(); ui.abs = {};
    for (const ab of D.abilities) {
      const b = el('button', 'ab'); b.type = 'button';
      b.title = str(`abilities.${ab.id}.desc`);
      const k = el('span', 'abkey', ab.keyLabel);
      const ic = el('span', 'abicon');
      const icon = D.icons?.[ab.icon];
      if (icon) { ic.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${icon.color}">${icon.svg}</svg>`; }
      const n = el('span', 'abname', abName(ab.id));
      const castLbl = ab.cast > 0 ? str('ui.castTime', { s: ab.cast }) : str('ui.instant');
      const tagVars = { amount: ab.amount, pct: Math.round((ab.amount || 0) * 100), mult: ab.regenMult, cast: castLbl };
      const tg = el('span', 'abtag', str(`abilities.${ab.id}.tag`, tagVars));
      const m = el('span', 'abmana', ab.mana ? str('ui.manaCost', { n: ab.mana }) : str('ui.free'));
      const cd = el('span', 'abcd', '');
      b.setAttribute('aria-label', `${abName(ab.id)}, ${tg.textContent}, ${m.textContent}, key ${ab.keyLabel}`);
      b.append(k, ic, n, tg, m, cd);
      b.addEventListener('click', () => tryCast(ab.id));
      abBox.append(b); ui.abs[ab.id] = { b, cd };
    }
    $('#log').replaceChildren();
    $('#showResult').hidden = true;
    $('#showResult').textContent = str('ui.showResult');
  }

  function render() {
    if (!S) return;
    const B = S.boss;
    setBar(ui.bossHp, B.hp / B.maxHp, `${Math.ceil(B.hp)} / ${B.maxHp}`);
    $('#phase').textContent = str('ui.phase', { n: B.phase });
    const bb = $('#bossBubble');
    const bShow = B.caption && B.captionEnd > S.t;
    if (bShow) bb.textContent = B.caption;
    setCls(bb, 'show', !!bShow);
    $('#timer').textContent = `${fmtS(S.t)}s`;

    // telegraphs
    const tl = $('#telegraphs'); tl.replaceChildren();
    for (const tg of B.telegraphs) {
      const row = el('div', 'tele');
      const who = tg.atk.hits === 'single' ? S.chars[tg.targetId].name : zoneName(tg.atk.zone);
      row.append(el('span', '', `⚠ ${str(tg.atk.hits === 'single' ? 'ui.telegraphSingle' : 'ui.telegraphZone', { attack: atkName(tg.atk.id), target: who, zone: who })}`));
      const b = bar('tbar'); setBar(b, (tg.end - S.t) / tg.atk.telegraph, `${fmtS(Math.max(0, tg.end - S.t))}s`);
      row.append(b); tl.append(row);
    }
    const fa = B.areas.filter(a => a.zone === 'front'), ba = B.areas.filter(a => a.zone === 'back');
    $('#frontArea').textContent = fa.length ? `🔥 ${str('ui.burning', { secs: fmtS(Math.max(...fa.map(a => a.end - S.t))) })}` : '';
    $('#backArea').textContent = ba.length ? `🔥 ${str('ui.burning', { secs: fmtS(Math.max(...ba.map(a => a.end - S.t))) })}` : '';

    // frames
    for (const id of S.order) {
      const c = S.chars[id], u = ui.frames[id];
      if (u.zone !== c.zone) { (c.zone === 'front' ? $('#frontList') : $('#backList')).append(u.f); u.zone = c.zone; }
      const hpText = str('ui.hpText', { hp: Math.ceil(c.hp), max: c.maxHp, pct: Math.ceil(pct(c) * 100) }) + (c.shield > 0 ? `  +${Math.ceil(c.shield)}◆` : '');
      setBar(u.hp, pct(c), hpText);
      const low = !c.down && pct(c) < D.party.lowHpAt;
      setCls(u.hp, 'low', low);
      setCls(u.f, 'low', low);
      // incoming attacks drawn inside the frame they will hit
      const incoming = B.telegraphs.filter(tg => tg.targetId === id || (tg.atk.hits === 'zone' && tg.atk.zone === c.zone))
        .sort((a, b) => a.end - b.end);
      if (incoming.length && !c.down) {
        const tg = incoming[0], left = Math.max(0, tg.end - S.t);
        if (u.warn.hidden) u.warn.hidden = false;
        setBar(u.warn, left / tg.atk.telegraph, `⚠ ${atkName(tg.atk.id)}  ${fmtS(left)}s` + (incoming.length > 1 ? `  +${incoming.length - 1}` : ''));
      } else if (!u.warn.hidden) u.warn.hidden = true;
      if (u.st) setBar(u.st, c.stamina / c.maxStamina, `${Math.floor(c.stamina)} st`);
      setCls(u.f, 'selected', S.target === id);
      setCls(u.f, 'down', c.down);
      u.tgt.textContent = S.target === id ? str('ui.target') : '';
      const sts = [];
      if (c.down) sts.push(c.isHealer ? str('status.down') : str('ui.reviveHint'));
      if (c.shield > 0) sts.push(str('status.shield', { n: Math.ceil(c.shield) }));
      if (c.exhausted) sts.push(str('status.exhausted'));
      if (c.neglected) sts.push(str('status.neglected'));
      if (c.restless) sts.push(str('status.restless'));
      if (c.shakenEnd > S.t) sts.push(str('status.shaken'));
      if (c.greedy) sts.push(str('status.greedy'));
      if (S.taunt && S.taunt.id === id && S.taunt.end > S.t) sts.push(str('status.taunt'));
      if (c.guardEnd > S.t) sts.push(str('status.guard'));
      if (c.casting) sts.push(str('status.casting', { ability: str(`allyAbilities.${c.casting.ab.id}`) }));
      if (S.called && S.called.id === id && S.called.end > S.t) sts.push(str('status.called'));
      u.status.textContent = sts.join('  ');
      setCls(u.f, 'threat', incoming.length > 0 && !c.down);
      u.act.textContent = c.actionEnd > S.t ? c.action : '';
      const showBubble = c.caption && c.captionEnd > S.t;
      if (showBubble) u.cap.textContent = c.caption;
      setCls(u.cap, 'show', !!showBubble);
      setCls(u.cap, 'left', c.zone === 'front');
      setCls(u.cap, 'right', c.zone !== 'front');
      const fl = [];
      if (c.hitText && c.hitText.end > S.t) fl.push(c.hitText.text);
      if (c.healText && c.healText.end > S.t) fl.push(c.healText.text);
      u.flo.textContent = fl.join(' ');
    }

    // healer panel
    const h = S.healer;
    setBar(ui.mana, h.mana / h.maxMana, `${str('ui.mana')} ${Math.floor(h.mana)} / ${h.maxMana}`);
    if (h.cast) {
      const frac = (S.t - h.cast.start) / (h.cast.end - h.cast.start);
      const tgc = S.chars[h.cast.targetId];
      let label = str('ui.casting', { ability: abName(h.cast.ab.id), target: tgc?.name ?? zoneName(h.zone) });
      const full = h.cast.ab.type === 'heal' && tgc && !tgc.down && tgc.hp >= tgc.maxHp;
      if (full) label = str('ui.targetFull');
      setBar(ui.cast, frac, `${label}  ${fmtS(Math.max(0, h.cast.end - S.t))}s`);
      setCls(ui.cast, 'wasted', full);
    } else if (h.breathe) {
      const on = S.t - h.breathe.start >= AB.breathe.windup;
      const frac = on ? 1 : (S.t - h.breathe.start) / AB.breathe.windup;
      setBar(ui.cast, frac, str('ui.breathing', { state: on ? str('ui.breatheActive', { mult: AB.breathe.regenMult }) : str('ui.breatheWindup') }));
    } else setBar(ui.cast, 0, str('ui.idle'));
    if (!h.cast) setCls(ui.cast, 'wasted', false);
    setCls(ui.cast, 'breathing', !!h.breathe);
    const g = Math.max(0, h.gcdEnd - S.t);
    setBar(ui.gcd, g / D.party.healer.gcd, g > 0 ? `${str('ui.gcd')} ${fmtS(g)}` : '');

    for (const ab of D.abilities) {
      const u = ui.abs[ab.id];
      const cdLeft = Math.max(0, (h.cds[ab.id] || 0) - S.t);
      u.cd.textContent = cdLeft > 0 ? `${fmtS(cdLeft)}s` : '';
      const wrongZone = ab.requiresZone && h.zone !== ab.requiresZone;
      const unusable = h.mana < ab.mana || cdLeft > 0 || (ab.gcd && g > 0) || wrongZone;
      setCls(u.b, 'unusable', unusable);
      setCls(u.b, 'active', (h.cast && !h.cast.step && h.cast.ab.id === ab.id) || (ab.id === 'breathe' && !!h.breathe) || false);
    }
    $('#msg').textContent = S.msg && S.msg.end > performance.now() ? S.msg.text : '';
    $('#pauseOverlay').hidden = !S.paused;

    // log
    if (S.logDirty) {
      const lg = $('#log');
      lg.replaceChildren(...S.log.map(e => el('div', `entry ${e.kind}`, `[${fmtS(e.t)}] ${e.text}`)));
      lg.scrollTop = lg.scrollHeight;
      S.logDirty = false;
    }
  }

  function showResult() {
    const r = $('#result');
    const s = S.stats;
    const total = s.healed + s.overheal;
    const downed = Object.values(S.chars).filter(c => c.down).map(c => c.name);
    r.replaceChildren();
    r.append(el('h2', S.result ? 'good' : 'bad', str(S.result ? 'ui.win' : 'ui.lose')));
    r.append(el('div', 'runinfo', settingsLine()));
    const dl = el('dl');
    const row = (k, v) => dl.append(el('dt', '', k), el('dd', '', v));
    row(str('ui.clearTime'), `${fmtS(S.t)}s`);
    if (!S.result) row(str('ui.bossHpLeft'), `${Math.ceil(S.boss.hp)} (${Math.round(S.boss.hp / S.boss.maxHp * 100)}%)`);
    row(str('ui.healingDone'), `${Math.round(s.healed)}`);
    row(str('ui.overheal'), total ? `${Math.round(s.overheal / total * 100)}%` : '0%');
    row(str('ui.manaSpent'), `${s.manaSpent}`);
    row(str('ui.casts'), `${s.casts}`);
    row(str('ui.cancels'), `${s.cancels}`);
    row(str('ui.downed'), downed.length ? downed.join(', ') : str('ui.none'));
    r.append(dl);
    const rv = el('div', 'verdicts');
    rv.append(el('h3', '', str('ui.partySays')));
    for (const a of allies()) {
      const row_ = el('div', `verdict ${a.verdict}`);
      const head = el('div', 'vhead');
      head.append(el('strong', '', a.name), el('span', 'vtag', str(`ui.verdict.${a.verdict}`)));
      row_.append(head, el('div', 'vline', `“${a.verdictLine}”`));
      const facts = [];
      if (a.rv.neglects) facts.push(str('ui.factNeglected', { n: a.rv.neglects }));
      if (a.rv.lowTime >= 1) facts.push(str('ui.factLow', { n: Math.round(a.rv.lowTime) }));
      if (a.rv.downs) facts.push(str('ui.factDowned', { n: a.rv.downs }));
      if (a.rv.revives) facts.push(str('ui.factRevived', { n: a.rv.revives }));
      row_.append(el('div', 'vfacts', facts.length ? facts.join(' · ') : str('ui.factClean')));
      rv.append(row_);
    }
    r.append(rv);
    const btns = el('div', 'btns');
    const retry = el('button', 'primary', str('ui.retry')); retry.type = 'button';
    retry.addEventListener('click', startFight);
    const set = el('button', '', str('ui.settings')); set.type = 'button';
    set.addEventListener('click', showSetup);
    const logBtn = el('button', '', str('ui.reviewLog')); logBtn.type = 'button';
    logBtn.addEventListener('click', () => {
      r.hidden = true; const d = $('.logbox'); d.open = true; d.scrollIntoView({ behavior: 'smooth' });
      $('#showResult').hidden = false;
    });
    btns.append(retry, set, logBtn); r.append(btns);
    const fb = el('div', 'btns feedback');
    const copy = el('button', '', str('ui.copyResults')); copy.type = 'button';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(resultText()); copy.textContent = str('ui.copied'); }
      catch { copy.textContent = str('ui.copyFailed'); }
    });
    fb.append(copy);
    const sb = supportLink('button support-btn'); if (sb) fb.append(sb);
    if (D.settings.feedbackUrl) {
      const a = el('a', 'button', str('ui.giveFeedback'));
      a.href = feedbackUrl(); a.target = '_blank'; a.rel = 'noopener';
      fb.append(a);
    }
    r.append(fb);
    if (D.settings.telemetryUrl) r.append(buildFeedbackForm());
    r.hidden = false;
    retry.focus();
  }

  function settingsLine() {
    const st = S.run;
    return str('ui.runInfo', { version: st.version, difficulty: str(`ui.difficultyOptions.${st.difficulty}`), speed: st.speed }) + (st.mature ? ` · ${str('ui.matureOn')}` : '');
  }
  function runVars() {
    const st = S.run;
    return { version: st.version, difficulty: st.difficulty, speed: st.speed, result: S.result ? 'win' : 'loss',
      time: Math.round(S.t), bossPct: Math.round(S.boss.hp / S.boss.maxHp * 100) };
  }
  function feedbackUrl() {
    const v = runVars();
    return D.settings.feedbackUrl.replace(/\{(\w+)\}/g, (m, k) => (k in v ? encodeURIComponent(v[k]) : m));
  }
  function resultText() {
    const s = S.stats, total = s.healed + s.overheal;
    const lines = [
      `${str('ui.title')} ${settingsLine()}`,
      `${str(S.result ? 'ui.win' : 'ui.lose')} · ${fmtS(S.t)}s` + (S.result ? '' : ` · ${str('ui.bossHpLeft')} ${Math.round(S.boss.hp / S.boss.maxHp * 100)}%`),
      `${str('ui.healingDone')} ${Math.round(s.healed)} · ${str('ui.overheal')} ${total ? Math.round(s.overheal / total * 100) : 0}% · ${str('ui.manaSpent')} ${s.manaSpent} · ${str('ui.casts')} ${s.casts}`,
      ...allies().map(a => `${a.name}: ${str(`ui.verdict.${a.verdict}`)} — “${a.verdictLine}”`)
    ];
    return lines.join('\n');
  }

  // ---------- telemetry ----------
  // Anonymous playtest data. Session id lives only in memory (new each page load); nothing is stored on the device.
  const TEL = { sessionId: Math.random().toString(36).slice(2, 10), runIndex: 0, shareNames: true };

  function post(payload) {
    const url = D.settings.telemetryUrl;
    if (!url) return Promise.resolve(false);
    // text/plain + no-cors avoids a CORS preflight, which Google Apps Script doesn't answer.
    return fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(() => true).catch(() => false);
  }

  function sendRun() {
    const st = D.settings, s = S.stats, total = s.healed + s.overheal;
    const p = {
      type: 'run', sessionId: TEL.sessionId, runIndex: S.run.runIndex, runId: S.run.runId, version: S.run.version,
      startedAt: S.run.startedAt, difficulty: S.run.difficulty, speed: S.run.speed,
      result: S.result ? 'win' : 'loss', fightTime: +S.t.toFixed(1),
      bossPctLeft: Math.round(S.boss.hp / S.boss.maxHp * 100), phaseReached: S.boss.phase,
      healingDone: Math.round(s.healed), overhealPct: total ? Math.round(s.overheal / total * 100) : 0,
      manaSpent: s.manaSpent, casts: s.casts, cancels: s.cancels, steps: s.steps,
      reviveAttempts: s.reviveAttempts, reviveInterrupts: s.reviveInterrupts, revives: s.revives,
      healerDown: S.healer.down,
      gender: st.gender, pronouns: st.pronouns, namesShared: TEL.shareNames, mature: S.run.mature,
      healerName: TEL.shareNames ? st.healerName : ''
    };
    for (const a of D.party.allies) {
      p[`nick_${a.id}`] = TEL.shareNames ? (st.nicknames[a.id] || '') : '';
      p[`nickSet_${a.id}`] = !!st.nicknames[a.id];
      p.nickPack = st.nickPack || 'none';
      const c = S.chars[a.id];
      p[`${a.id}_verdict`] = c.verdict; p[`${a.id}_neglects`] = c.rv.neglects;
      p[`${a.id}_lowTime`] = Math.round(c.rv.lowTime); p[`${a.id}_downs`] = c.rv.downs;
    }
    for (const ab of D.abilities) if (ab.type !== 'step') p[`use_${ab.id}`] = s.byAbility[ab.id] || 0;
    post(p);
  }

  function sendFeedback(fun, hard, comment, wantMature) {
    return post({ type: 'feedback', sessionId: TEL.sessionId, runId: S.run.runId, version: S.run.version,
      difficulty: S.run.difficulty, speed: S.run.speed, result: S.result ? 'win' : 'loss', fun, hard, comment, wantMature });
  }

  function ratingRow(label, name) {
    const fs = el('fieldset', 'rating');
    fs.append(el('legend', '', label));
    const wrap = el('div', 'rbtns');
    for (let n = 1; n <= 5; n++) {
      const id = `r_${name}_${n}`;
      const i = el('input'); i.type = 'radio'; i.name = name; i.value = n; i.id = id;
      const l = el('label', '', String(n)); l.htmlFor = id;
      wrap.append(i, l);
    }
    fs.append(wrap, el('div', 'rscale', str(`ui.scale_${name}`)));
    return fs;
  }

  function buildFeedbackForm() {
    const box = el('form', 'fbform');
    box.append(el('h3', '', str('ui.feedbackTitle')));
    box.append(ratingRow(str('ui.rateFun'), 'fun'), ratingRow(str('ui.rateHard'), 'hard'));
    const mq = el('fieldset', 'rating');
    mq.append(el('legend', '', str('ui.wantMature')));
    const mw = el('div', 'rbtns wide');
    for (const k of ['yes', 'no', 'unsure']) {
      const i = el('input'); i.type = 'radio'; i.name = 'mature'; i.value = k; i.id = `r_mature_${k}`;
      const l = el('label', '', str(`ui.mature.${k}`)); l.htmlFor = i.id;
      mw.append(i, l);
    }
    mq.append(mw); box.append(mq);
    const ta = el('textarea'); ta.maxLength = 1000; ta.rows = 3; ta.id = 'fbComment';
    const tl = el('label', 'field'); tl.append(el('span', '', str('ui.comment')), ta);
    box.append(tl);
    const send = el('button', 'primary', str('ui.sendFeedback')); send.type = 'submit';
    const status = el('span', 'fbstatus', '');
    const row = el('div', 'btns'); row.append(send, status); box.append(row);
    box.addEventListener('submit', async e => {
      e.preventDefault();
      const fun = Number(box.querySelector('input[name=fun]:checked')?.value) || '';
      const hard = Number(box.querySelector('input[name=hard]:checked')?.value) || '';
      const mature = box.querySelector('input[name=mature]:checked')?.value || '';
      if (!fun && !hard && !mature && !ta.value.trim()) { status.textContent = str('ui.feedbackEmpty'); return; }
      send.disabled = true;
      await sendFeedback(fun, hard, ta.value.trim(), mature);
      status.textContent = str('ui.feedbackThanks');
    });
    return box;
  }

  function supportLink(cls) {
    const url = D.settings.supportUrl;
    if (!url) return null;
    const a = el('a', cls, str('ui.support'));
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    return a;
  }

  // ---------- setup screen ----------
  function buildSetup() {
    const st = D.settings, U = D.strings.ui;
    const t = $('#title'); t.replaceChildren(el('span', 'tsys', str('ui.titleSystem')), el('span', 'tneon', str('ui.titleNeon')), el('span', 'tsub', str('ui.titleSub')));
    document.title = str('ui.title');
    t.setAttribute('aria-label', str('ui.title'));
    $('#setupTitle').textContent = str('ui.setupTitle');
    $('#version').textContent = D.settings.version;
    const how = $('#howTo'); how.replaceChildren();
    how.append(el('summary', '', str('ui.howToTitle')));
    const ul = el('ul'); for (const line of D.strings.ui.howTo) ul.append(el('li', '', fmt(line, baseVars()))); how.append(ul);
    $('#desktopNote').textContent = str('ui.desktopOnly');
    const c = D.strings.ui.contract, card = $('#contract');
    if (c && card) {
      card.replaceChildren(el('div', 'ctitle', fmt(c.title, baseVars())));
      const dl = el('dl');
      for (const [k, v] of c.rows) dl.append(el('dt', '', k), el('dd', '', fmt(v, baseVars())));
      card.append(dl);
    }
    setCls($('#desktopNote'), 'warn', !!(window.matchMedia && matchMedia('(pointer: coarse)').matches));
    const f = $('#setupForm'); f.replaceChildren();
    const field = (label, input) => { const l = el('label', 'field'); l.append(el('span', '', label), input); f.append(l); return input; };
    const nameI = el('input'); nameI.value = st.healerName; nameI.maxLength = 20; nameI.id = 'sName';
    field(str('ui.healerName'), nameI);
    const sel = (opts, val, id) => { const s = el('select'); s.id = id; for (const [k, v] of Object.entries(opts)) { const o = el('option', '', v); o.value = k; s.append(o); } s.value = val; return s; };
    field(str('ui.gender'), sel(U.genderOptions, st.gender, 'sGender'));
    field(str('ui.pronouns'), sel(U.pronounOptions, st.pronouns, 'sPronouns'));
    // 18+ mature mode: one deliberate opt-in (age attestation + clear description)
    const mt = el('div', 'telnote mature');
    mt.append(el('div', 'mtitle', str('ui.matureLabel')));
    const ml = el('label', 'check'); const mcb = el('input'); mcb.type = 'checkbox'; mcb.id = 'sMature'; mcb.checked = !!st.mature;
    ml.append(mcb, el('span', '', str('ui.matureCheck'))); mt.append(ml, el('p', '', str('ui.matureHelp')));
    f.append(mt);
    const fs = el('fieldset'); fs.append(el('legend', '', str('ui.nicknames')));
    // Nickname packs fill the boxes; editing any box switches the picker to "Custom".
    let packs = nicknamePacks();
    const packSel = el('select'); packSel.id = 'sPack';
    const fillPackOptions = () => {
      const cur = packSel.value || st.nickPack || 'none';
      packSel.replaceChildren();
      for (const p of packs) {
        const o = el('option', '', str(`ui.packs.${p.id}`) + (p.flag ? ` (${str(`ui.packFlags.${p.flag}`)})` : ''));
        o.value = p.id; packSel.append(o);
      }
      const c = el('option', '', str('ui.packs.custom')); c.value = 'custom'; packSel.append(c);
      packSel.value = [...packSel.options].some(o => o.value === cur) ? cur : 'none';
    };
    fillPackOptions();
    const pl = el('label', 'field'); pl.append(el('span', '', str('ui.nickPack')), packSel); fs.append(pl);
    const inputs = {};
    for (const a of D.party.allies) {
      const l = el('label', 'field'); const i = el('input'); i.maxLength = 20; i.value = st.nicknames[a.id] || ''; i.id = `sNick_${a.id}`;
      i.placeholder = str('ui.nickPlaceholder');
      i.addEventListener('input', () => { packSel.value = 'custom'; });
      inputs[a.id] = i;
      l.append(el('span', '', a.name), i); fs.append(l);
    }
    const fillPack = () => {
      const p = packs.find(x => x.id === packSel.value);
      if (!p) return;
      const g = $('#sGender')?.value || st.gender;
      const pr = st.pronounSets[$('#sPronouns')?.value || st.pronouns] || st.pronounSets.they;
      const vars = { healerName: $('#sName')?.value.trim() || 'Healer', gender: g, subj: pr.subj, obj: pr.obj, poss: pr.poss };
      for (const a of D.party.allies) inputs[a.id].value = fmt(p.nicknames[a.id] || '', vars);
    };
    packSel.addEventListener('change', fillPack);
    mcb.addEventListener('change', () => {
      D.settings.mature = mcb.checked;
      const before = packSel.value;
      packs = nicknamePacks(); fillPackOptions();
      // a mature pack was picked and mature got switched off: fall back to None and clear its names
      if (packSel.value !== before) fillPack();
    });
    f.append(fs);
    setTimeout(() => $('#sGender')?.addEventListener('change', () => { if (packSel.value !== 'custom') fillPack(); }));
    const diff = sel(U.difficultyOptions, st.difficulty, 'sDiff');
    field(str('ui.difficulty'), diff);
    const dHelp = el('div', 'help'); f.append(dHelp);
    const showD = () => { dHelp.textContent = str(`ui.difficultyHelp.${diff.value}`); };
    diff.addEventListener('change', showD); showD();
    const sp = el('input'); sp.type = 'range'; sp.min = st.speedMin; sp.max = st.speedMax; sp.step = st.speedStep; sp.value = st.speed; sp.id = 'sSpeed';
    const spv = el('output', '', `${st.speed}%`);
    sp.addEventListener('input', () => { spv.textContent = `${sp.value}%`; });
    const l = field(str('ui.speed'), sp); l.parentElement.append(spv);
    f.append(el('div', 'help', str('ui.speedHelp')));
    if (st.telemetryUrl) {
      const t = el('div', 'telnote');
      t.append(el('p', '', str('ui.telemetryNotice')));
      const cl = el('label', 'check'); const cb = el('input'); cb.type = 'checkbox'; cb.id = 'sShareNames'; cb.checked = TEL.shareNames;
      cl.append(cb, el('span', '', str('ui.shareNames'))); t.append(cl);
      f.append(t);
    }
    const go = el('button', 'primary', str('ui.start')); go.type = 'submit';
    f.append(go);
    const sl = supportLink('support'); if (sl) { const p = el('p', 'supportline'); p.append(el('span', '', str('ui.supportLead') + ' '), sl); f.append(p); }
  }

  function readSetup() {
    const st = D.settings;
    st.healerName = $('#sName').value.trim() || 'Healer';
    st.gender = $('#sGender').value;
    st.pronouns = $('#sPronouns').value;
    for (const a of D.party.allies) st.nicknames[a.id] = $(`#sNick_${a.id}`).value.trim();
    if ($('#sPack')) st.nickPack = $('#sPack').value;
    if ($('#sMature')) st.mature = $('#sMature').checked;
    st.speed = Number($('#sSpeed').value);
    st.difficulty = $('#sDiff').value;
    if ($('#sShareNames')) TEL.shareNames = $('#sShareNames').checked;
  }

  function showSetup() {
    S = null;
    $('#result').hidden = true; $('#game').hidden = true; $('#setup').hidden = false;
    buildSetup();
    $('#sName').focus();
  }

  function startFight() {
    $('#result').hidden = true; $('#setup').hidden = true; $('#game').hidden = false;
    newFight(); buildUI(); render();
  }

  // ---------- input ----------
  document.addEventListener('keydown', e => {
    if (!S || $('#game').hidden || S.over) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return; // let forms keep normal keys (incl. Tab)
    const k = D.settings.keys;
    if (e.code in D.settings.targetKeys) { e.preventDefault(); S.target = D.settings.targetKeys[e.code]; return; }
    if (e.code === k.pause) { if (!S.over) S.paused = !S.paused; return; }
    if (e.code === k.cancel) { cancelCast(); return; }
    if (e.code in KEY_TO_AB) { e.preventDefault(); if (!e.repeat) tryCast(KEY_TO_AB[e.code]); }
  });

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (S && !S.over && !S.paused) step(dt * D.settings.speed / 100);
    if (S) render();
    requestAnimationFrame(frame);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('#setupForm')) return; // e.g. preview.html loads game.js only for its formatter
    $('#showResult').addEventListener('click', () => { $('#result').hidden = false; $('#showResult').hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $('#setupForm').addEventListener('submit', e => { e.preventDefault(); readSetup(); startFight(); });
    showSetup();
    requestAnimationFrame(frame);
  });

  // exposed for console tinkering / tests
  window.HEALER = { get state() { return S; }, step: dt => step(dt), tryCast, fmt, restart: () => startFight() };
})();
