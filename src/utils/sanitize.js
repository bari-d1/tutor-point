export function sanitizeText(v) {
    if (v === null || v === undefined) return "";
    return String(v).trim();
  }
  
  export function sanitizeEmail(v) {
    const s = sanitizeText(v).toLowerCase();
    if (!s) return "";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    return ok ? s : "";
  }
  
  export function sanitizePhone(v) {
    const s = sanitizeText(v);
    if (!s) return "";
    // keep digits + plus
    const cleaned = s.replace(/[^\d+]/g, "");
    return cleaned.length >= 7 ? cleaned : "";
  }
  