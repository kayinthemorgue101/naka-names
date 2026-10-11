// Port of the naming rules in Fl1ntstowned/shielded-ordinals src/v1/names.mjs (SHORD v1).
// Kept byte-for-byte equivalent where it matters: endings, label regex, '--' ban, reserved list.
export const NAME_ENDINGS = ['naka', 'shield'];
export const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{1,18})[a-z0-9]$/;
export const ADDRESS_RE = /^shord1[0-9a-f]{128}$/;
export const RESERVED_LABELS = new Set([
  'orddropz', 'ord-dropz', 'orddrop', 'ord-drop', 'dropz', 'admin', 'administrator', 'support', 'help', 'official', 'team', 'staff',
  'mod', 'moderator', 'shielded', 'shield', 'shord', 'naka', 'nakas', 'vault', 'wallet', 'relayer', 'relay', 'treasury', 'escrow',
  'bitcoin', 'satoshi', 'nakamoto', 'null', 'undefined', 'unisat', 'xverse', 'magiceden', 'magic-eden', 'opensea',
]);
export function parseName(input) { // identical to the repo's parseName
  if (typeof input !== 'string') return null;
  const m = /^([^.\s]+)\.([a-z]+)$/.exec(input.trim().toLowerCase());
  if (!m || !NAME_ENDINGS.includes(m[2]) || !LABEL_RE.test(m[1]) || m[1].includes('--')) return null;
  return { label: m[1], ending: m[2], full: `${m[1]}.${m[2]}` };
}
export const isShieldedAddress = (a) => typeof a === 'string' && ADDRESS_RE.test(a.trim().toLowerCase());

/** Human input ("Kayy", "kayy.shield", " OBI.NAKA ") -> { ok, label, ending|null, reason? } */
export function classify(input) {
  let s = String(input ?? '').trim().toLowerCase();
  if (!s) return { ok: false, reason: 'Type something first. Even the dead have names.' };
  let ending = null;
  const dot = s.lastIndexOf('.');
  if (dot >= 0) {
    const end = s.slice(dot + 1), lab = s.slice(0, dot);
    if (!NAME_ENDINGS.includes(end)) return { ok: false, label: lab, reason: `“.${end}” isn't an ending here. Only .naka or .shield.` };
    ending = end; s = lab;
  }
  if (s.includes('.')) return { ok: false, label: s, reason: 'One dot only, before the ending.' };
  if (/\s/.test(s)) return { ok: false, label: s, reason: 'No spaces. Names are one word, like a headstone with a tight budget.' };
  if (s.length < 3) return { ok: false, label: s, reason: 'At least 3 characters.' };
  if (s.length > 20) return { ok: false, label: s, reason: `At most 20 characters (that's ${s.length}).` };
  if (!/^[a-z0-9-]+$/.test(s)) return { ok: false, label: s, reason: 'Letters a–z, numbers and dashes only. No emoji, no accents, no flourishes.' };
  if (s.startsWith('-') || s.endsWith('-') || s.includes('--')) return { ok: false, label: s, reason: 'A dash goes between characters, one at a time. Not at the ends, never doubled.' };
  if (!parseName(`${s}.naka`)) return { ok: false, label: s, reason: 'Not a valid name.' }; // belt and braces
  if (RESERVED_LABELS.has(s)) return { ok: true, reserved: true, label: s, ending };
  return { ok: true, label: s, ending };
}
