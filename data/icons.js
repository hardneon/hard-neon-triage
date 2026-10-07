// Ability icons: 24×24 SVG markup + colour. Referenced by "icon" in abilities.js.
// Colour is never the only cue: each icon also differs in shape, and buttons carry a text tag.
window.DATA = window.DATA || {};
(() => {
  // a plus sign centred at (cx, cy); size = arm length, w = arm width
  const plus = (cx, cy, size, w) => {
    const h = size / 2, t = w / 2;
    return `M${cx - t} ${cy - h}h${w}v${h - t}h${h - t}v${w}h${-(h - t)}v${h - t}h${-w}v${-(h - t)}h${-(h - t)}v${-w}h${h - t}z`;
  };
  const path = d => `<path d="${d}"/>`;
  DATA.icons = {
    cross1: { color: "#3FD98A", svg: path(plus(12, 12, 16, 5.5)) },
    cross2: { color: "#3FD98A", svg: path(plus(6.5, 12, 10.5, 3.6)) + path(plus(17.5, 12, 10.5, 3.6)) },
    cross3: { color: "#3FD98A", svg: path(plus(12, 6.5, 9.5, 3.2)) + path(plus(6.5, 17.5, 9.5, 3.2)) + path(plus(17.5, 17.5, 9.5, 3.2)) },
    shield: { color: "#FFFFFF", svg: path("M12 2 L20 5 V11.5 C20 16.5 16.5 20.2 12 22 C7.5 20.2 4 16.5 4 11.5 V5 Z") },
    burst:  { color: "#3FD98A", svg: path("M12 1 L14.2 8.2 L21.5 6 L16.6 11.8 L22.5 16 L15 16.2 L14.6 23 L12 16.8 L9.4 23 L9 16.2 L1.5 16 L7.4 11.8 L2.5 6 L9.8 8.2 Z") },
    bolt:   { color: "#569EFF", svg: path("M13.5 1.5 L4 14 H11 L9.5 22.5 L20 9.5 H13 Z") },
    drop:   { color: "#71D5F8", svg: path("M12 2 C12 2 5 10 5 15 A7 7 0 0 0 19 15 C19 10 12 2 12 2 Z") },
    heart:  { color: "#FF2D8D", svg: path("M12 21.5 C5 15.5 2 12.2 2 8.2 A5 5 0 0 1 12 6.3 A5 5 0 0 1 22 8.2 C22 12.2 19 15.5 12 21.5 Z") },
    // ally class icons (muted, so they never read as ability colours)
    role_tank:   { color: "#DBFAFC", svg: path("M12 2 L20 5 V11.5 C20 16.5 16.5 20.2 12 22 C7.5 20.2 4 16.5 4 11.5 V5 Z M12 5 V19 C15 17.6 17.5 15 17.5 11.5 V6.8 Z") },
    role_melee:  { color: "#DBFAFC", svg: path("M20.5 2 L22 3.5 L11 14.5 L9.5 13 Z M8 13 L11 16 L9.6 17.4 L8.3 16.1 L4.6 19.8 L5.4 20.6 L4 22 L2 20 L3.4 18.6 L4.2 19.4 L7.9 15.7 L6.6 14.4 Z") },
    role_ranged: { color: "#DBFAFC", svg: path("M12 1 L14 9.5 L22.5 12 L14 14.5 L12 23 L10 14.5 L1.5 12 L10 9.5 Z") },
    arrows: { color: "#FFFFFF", svg: path("M2 12 L8 6.5 V10 H16 V6.5 L22 12 L16 17.5 V14 H8 V17.5 Z") }
  };
})();
