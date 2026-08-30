import type { TwitchChatMessagePayload } from '@fox-sphere/types';

export type TextToken =
  | { type: 'text'; content: string }
  | { type: 'link'; content: string }
  | { type: 'emote'; id: string; name: string; url: string };

const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?)\]"'`]+$/;

function splitTextTokens(content: string): TextToken[] {
  const tokens: TextToken[] = [];
  const matches = Array.from(content.matchAll(URL_PATTERN));
  let currentIndex = 0;

  for (const match of matches) {
    const raw = match[0];
    const matchIndex = match.index;
    if (raw === undefined || matchIndex === undefined) continue;

    if (matchIndex > currentIndex) {
      tokens.push({
        type: 'text',
        content: Array.from(content).slice(currentIndex, matchIndex).join(''),
      });
    }

    const url = raw.replace(TRAILING_PUNCTUATION_PATTERN, '');
    if (url.length > 0) {
      tokens.push({ type: 'link', content: url });
    } else {
      tokens.push({ type: 'text', content: raw });
    }

    currentIndex = matchIndex + raw.length;
  }

  if (currentIndex < content.length) {
    tokens.push({
      type: 'text',
      content: Array.from(content).slice(currentIndex).join(''),
    });
  }

  return tokens;
}

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
    return splitTextTokens(text);
  }

  replacements.sort((a, b) => a.start - b.start);

  const chars = Array.from(text);
  const tokens: TextToken[] = [];
  let currentIndex = 0;

  for (const rep of replacements) {
    if (rep.start < currentIndex) continue;

    if (rep.start > currentIndex) {
      tokens.push(...splitTextTokens(chars.slice(currentIndex, rep.start).join('')));
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
    tokens.push(...splitTextTokens(chars.slice(currentIndex).join('')));
  }

  return tokens;
}
