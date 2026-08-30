import { describe, expect, it } from 'vitest';
import { parseTwitchEmotes } from '../parseTwitchEmotes';

// TwitchChatMessagePayload['emotes'] is always a Record - chatbot.service.ts builds one
// with Object.fromEntries and sends {} when there are no emotes. The parser also handles
// a raw JSON string and undefined, but nothing in this repo can produce either, so those
// branches are not exercised here.
const noEmotes = {};

describe('parseTwitchEmotes', () => {
  it('returns nothing for an empty message', () => {
    expect(parseTwitchEmotes(undefined, noEmotes)).toEqual([]);
    expect(parseTwitchEmotes('', noEmotes)).toEqual([]);
  });

  it('passes plain text through as a single token', () => {
    expect(parseTwitchEmotes('hello chat', noEmotes)).toEqual([
      { type: 'text', content: 'hello chat' },
    ]);
  });

  it('splits a url into its own link token', () => {
    expect(parseTwitchEmotes('see https://twitch.tv now', noEmotes)).toEqual([
      { type: 'text', content: 'see ' },
      { type: 'link', content: 'https://twitch.tv' },
      { type: 'text', content: ' now' },
    ]);
  });

  it('leaves trailing punctuation outside the link', () => {
    const tokens = parseTwitchEmotes('go to https://twitch.tv.', noEmotes);
    expect(tokens).toContainEqual({ type: 'link', content: 'https://twitch.tv' });
  });

  it('replaces an emote at its reported position', () => {
    expect(parseTwitchEmotes('Kappa hi', { '25': ['0-4'] })).toEqual([
      {
        type: 'emote',
        id: '25',
        name: 'Kappa',
        url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/2.0',
      },
      { type: 'text', content: ' hi' },
    ]);
  });

  it('leaves the text alone when the emote map is empty', () => {
    expect(parseTwitchEmotes('Kappa', noEmotes)).toEqual([
      { type: 'text', content: 'Kappa' },
    ]);
  });

  it('ignores an entry whose positions are malformed', () => {
    expect(parseTwitchEmotes('Kappa', { '25': ['not-a-range'] })).toEqual([
      { type: 'text', content: 'Kappa' },
    ]);
  });

  // Twitch counts emote positions in code points, so a preceding emoji must not
  // shift the slice - this is why the parser works over Array.from(text).
  it('counts positions in code points, not UTF-16 units', () => {
    const tokens = parseTwitchEmotes('🦊 Kappa', { '25': ['2-6'] });
    expect(tokens).toContainEqual(
      expect.objectContaining({ type: 'emote', name: 'Kappa' }),
    );
  });

  it('keeps emotes in order when the map lists them out of order', () => {
    const tokens = parseTwitchEmotes('Kappa PogChamp', {
      '88': ['6-13'],
      '25': ['0-4'],
    });

    expect(tokens.map((token) => ('name' in token ? token.name : token.content))).toEqual([
      'Kappa',
      ' ',
      'PogChamp',
    ]);
  });
});
