// Turns a finished reading into plain text — what a visitor gets when they copy
// or save it, not a dump of the internal message shape. Typing indicators carry
// nothing worth keeping; images are noted by name only, since the visitor is
// saving text to paste elsewhere, not the artwork itself.
export function formatTranscript(messages, personaName = 'Her') {
  const lines = [];
  for (const m of messages) {
    if (m.who === 'persona') lines.push(`${personaName}: ${m.text}`);
    else if (m.who === 'user') lines.push(`You: ${m.text}`);
    else if (m.who === 'list' && m.items?.length) lines.push(m.items.map((i) => `• ${i}`).join('\n'));
  }
  return lines.join('\n\n');
}
