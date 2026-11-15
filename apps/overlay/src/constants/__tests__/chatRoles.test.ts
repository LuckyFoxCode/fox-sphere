import { describe, expect, it } from 'vitest';
import {
  CHAT_ROLES,
  CHAT_ROLE_RULES,
  CHAT_ROLE_STYLES,
  resolveChatRole,
  type ChatRoleFlags,
} from '../chatRoles';

type Flags = Partial<ChatRoleFlags> & { isFounder?: boolean };

const BASE: ChatRoleFlags = {
  isBroadcaster: false,
  isBot: false,
  isMod: false,
  isVip: false,
  isPermanentVip: false,
  isSubscriber: false,
  isFollower: false,
};

const flags = (overrides: Flags = {}): ChatRoleFlags => ({ ...BASE, ...overrides });

describe('resolveChatRole', () => {
  it('resolves every single flag to its own role', () => {
    expect(resolveChatRole(flags({ isBroadcaster: true }))).toBe('broadcaster');
    expect(resolveChatRole(flags({ isBot: true }))).toBe('bot');
    expect(resolveChatRole(flags({ isMod: true }))).toBe('mod');
    expect(resolveChatRole(flags({ isVip: true }))).toBe('vip');
    expect(resolveChatRole(flags({ isSubscriber: true }))).toBe('sub');
    expect(resolveChatRole(flags({ isFollower: true }))).toBe('follower');
  });

  it('falls back to viewer for a plain viewer', () => {
    expect(resolveChatRole(flags())).toBe('viewer');
  });

  it('treats a permanent vip as vip', () => {
    expect(resolveChatRole(flags({ isPermanentVip: true }))).toBe('vip');
    expect(resolveChatRole(flags({ isVip: true, isPermanentVip: true }))).toBe('vip');
  });

  it('reports a bot that is also a mod as bot, not mod', () => {
    expect(resolveChatRole(flags({ isBot: true, isMod: true }))).toBe('bot');
  });

  it('keeps the broadcaster above every other flag', () => {
    expect(
      resolveChatRole(
        flags({
          isBroadcaster: true,
          isBot: true,
          isMod: true,
          isVip: true,
          isPermanentVip: true,
          isSubscriber: true,
          isFollower: true,
        }),
      ),
    ).toBe('broadcaster');
  });

  it('walks the ladder in order for a viewer with several roles', () => {
    expect(resolveChatRole(flags({ isMod: true, isSubscriber: true, isFollower: true }))).toBe(
      'mod',
    );
    expect(resolveChatRole(flags({ isSubscriber: true, isFollower: true }))).toBe('sub');
    expect(resolveChatRole(flags({ isFollower: true }))).toBe('follower');
  });

  it('ignores isFounder', () => {
    expect(resolveChatRole(flags({ isFounder: true }))).toBe('viewer');
    expect(resolveChatRole(flags({ isFounder: true, isSubscriber: true }))).toBe('sub');
  });

  it('keeps every rule pointing at a distinct role, in priority order', () => {
    const roles = CHAT_ROLE_RULES.map((rule) => rule.role);

    expect(new Set(roles).size).toBe(roles.length);
    expect(roles).toEqual(CHAT_ROLES.filter((role) => role !== 'viewer'));
  });
});

describe('CHAT_ROLE_STYLES', () => {
  it('styles exactly the roles the bridge can resolve', () => {
    expect(Object.keys(CHAT_ROLE_STYLES).sort()).toEqual([...CHAT_ROLES].sort());
  });

  it('gives every role a label and all four surfaces', () => {
    for (const role of CHAT_ROLES) {
      const style = CHAT_ROLE_STYLES[role];

      expect(style.label).not.toBe('');
      for (const surface of [style.chip, style.frame, style.header, style.body]) {
        expect(surface.trim()).not.toBe('');
      }
    }
  });

  it('keeps every surface of a role inside that role palette family', () => {
    for (const role of CHAT_ROLES) {
      const style = CHAT_ROLE_STYLES[role];
      const family = /(?:border|from|to|bg|text)-([a-z]+)-\d+/.exec(style.frame)?.[1];

      expect(family, `no palette family in ${role}.frame`).toBeDefined();
      for (const surface of [style.chip, style.header, style.body]) {
        expect(surface).toContain(`${family}-`);
      }
    }
  });

  it('names palette shades instead of hardcoding hex', () => {
    for (const role of CHAT_ROLES) {
      const style = CHAT_ROLE_STYLES[role];

      for (const surface of [style.chip, style.frame, style.header, style.body]) {
        expect(surface).not.toContain('#');
      }
    }
  });
});
