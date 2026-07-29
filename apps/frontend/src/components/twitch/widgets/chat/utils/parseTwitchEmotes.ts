import type { TwitchChatMessagePayload } from '@fox-sphere/types';

export type TextToken =
  | { type: 'text'; content: string }
  | { type: 'emote'; id: string; name: string; url: string };

function parseEmotesRaw(emotes: unknown): Record<string, string[]> {
  if (!emotes) return {};
  if (typeof emotes === 'object') return emotes as Record<string, string[]>;
  if (typeof emotes === 'string') {
    try {
      return JSON.parse(emotes);
    } catch {
      return {};
    }
  }
  return {};
}

export function parseTwitchEmotes(
  text: string | undefined,
  emotesRaw: TwitchChatMessagePayload['emotes'],
): TextToken[] {
  if (!text) return [];

  const parsedEmotes = parseEmotesRaw(emotesRaw);
  const replacements: { start: number; end: number; id: string }[] = [];

  for (const [emoteId, positions] of Object.entries(parsedEmotes)) {
    if (!Array.isArray(positions)) continue;

    for (const pos of positions) {
      if (typeof pos !== 'string') continue;
      const [startStr = '', endStr = ''] = pos.split('-');
      const start = Number(startStr);
      const end = Number(endStr);

      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        replacements.push({ start, end, id: emoteId });
      }
    }
  }

  if (replacements.length === 0) {
    return [{ type: 'text', content: text }];
  }

  replacements.sort((a, b) => a.start - b.start);

  const chars = Array.from(text);
  const tokens: TextToken[] = [];
  let currentIndex = 0;

  for (const rep of replacements) {
    if (rep.start < currentIndex) continue;

    if (rep.start > currentIndex) {
      tokens.push({
        type: 'text',
        content: chars.slice(currentIndex, rep.start).join(''),
      });
    }

    const emoteName = chars.slice(rep.start, rep.end + 1).join('');

    tokens.push({
      type: 'emote',
      id: rep.id,
      name: emoteName,
      url: `https://static-cdn.jtvnw.net/emoticons/v2/${rep.id}/default/dark/2.0`,
    });

    currentIndex = rep.end + 1;
  }

  if (currentIndex < chars.length) {
    tokens.push({
      type: 'text',
      content: chars.slice(currentIndex).join(''),
    });
  }

  return tokens;
}
