// Simple HTML escaper for frontend to prevent XSS when inserting untrusted strings
window.escapeHtml = function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

window.escapeJoin = function escapeJoin(arr, sep = ', ') {
  if (!Array.isArray(arr)) return '';
  return arr.map((i) => window.escapeHtml(i)).join(sep);
};
