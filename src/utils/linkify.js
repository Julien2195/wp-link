// Small utility to convert plain-text URLs in a string into an array of React nodes
// Returns an array: strings and objects for links; caller can render accordingly.
export default function linkify(text) {
  if (!text && text !== 0) return [];
  const str = String(text);
  // Simple URL regex (http/https)
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(str)) !== null) {
    const idx = match.index;
    if (idx > lastIndex) {
      parts.push(str.slice(lastIndex, idx));
    }
    parts.push({ href: match[0] });
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < str.length) parts.push(str.slice(lastIndex));
  return parts;
}
