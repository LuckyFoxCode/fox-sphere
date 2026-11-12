import type { TwitchChatMessagePayload } from '@fox-sphere/types';

export const CHAT_ROLES = [
  'broadcaster',
  'bot',
  'mod',
  'vip',
  'sub',
  'follower',
  'viewer',
] as const;

export type ChatRole = (typeof CHAT_ROLES)[number];

/** Только те флаги, которые отвечают на вопрос «кто это». `isFounder` в чипе не участвует. */
export type ChatRoleFlags = Pick<
  TwitchChatMessagePayload,
  'isBroadcaster' | 'isBot' | 'isMod' | 'isVip' | 'isPermanentVip' | 'isSubscriber' | 'isFollower'
>;

export interface ChatRoleRule {
  role: ChatRole;
  matches: (flags: ChatRoleFlags) => boolean;
}

export interface ChatRoleStyle {
  label: string;
  /**
   * Четыре поверхности одной роли. Геометрия (`border-2`, `rounded-*`, `bg-linear-to-r`) живёт в
   * разметке и одинакова у всех, здесь только цвета:
   * - `chip` - плашка роли в шапке: `border-500 bg-500/5 text-400/70`;
   * - `frame` - внешняя рамка сообщения: `border-500`;
   * - `header` - тёмная полоса под медаль и плашки: `from-400 to-900`;
   * - `body` - светлое тело сообщения: `from-50 to-200`.
   *
   * Цвета берутся из палитры Tailwind по имени, без своих токенов в `main.css`: это те же
   * значения, но шейд можно сдвинуть в одном месте, и видно, что surfaces одной роли - одна семья.
   */
  chip: string;
  frame: string;
  header: string;
  body: string;
}

/**
 * Порядок массива - это и есть приоритет: срабатывает первое совпадение, поэтому бот-модератор
 * получает `bot`, а стример с флагом бота - `broadcaster`. Менять приоритет - значит двигать
 * строки здесь, а не добавлять условия на месте.
 *
 * `viewer` в таблице нет: это fallback `resolveChatRole`, в который попадает любой зритель.
 * `isVip || isPermanentVip` - одно и то же состояние, как и в `useHeroOverlay`.
 */
export const CHAT_ROLE_RULES: readonly ChatRoleRule[] = [
  { role: 'broadcaster', matches: (flags) => flags.isBroadcaster },
  { role: 'bot', matches: (flags) => flags.isBot },
  { role: 'mod', matches: (flags) => flags.isMod },
  { role: 'vip', matches: (flags) => flags.isVip || flags.isPermanentVip },
  { role: 'sub', matches: (flags) => flags.isSubscriber },
  { role: 'follower', matches: (flags) => flags.isFollower },
];

export const CHAT_ROLE_STYLES = {
  broadcaster: {
    label: 'streamer',
    chip: 'border-sky-500 bg-sky-500/5 text-sky-400/70',
    frame: 'border-sky-500',
    header: 'border-slate-800 from-sky-400 to-sky-900',
    body: 'from-sky-50 to-sky-200',
  },
  bot: {
    label: 'bot',
    chip: 'border-cyan-500 bg-cyan-500/5 text-cyan-400/70',
    frame: 'border-cyan-500',
    header: 'border-slate-800 from-cyan-400 to-cyan-900',
    body: 'from-cyan-50 to-cyan-200',
  },
  mod: {
    label: 'mod',
    chip: 'border-green-500 bg-green-500/5 text-green-400/70',
    frame: 'border-green-500',
    header: 'border-slate-800 from-green-400 to-green-900',
    body: 'from-green-50 to-green-200',
  },
  vip: {
    label: 'vip',
    chip: 'border-pink-500 bg-pink-500/5 text-pink-400/70',
    frame: 'border-pink-500',
    header: 'border-slate-800 from-pink-400 to-pink-900',
    body: 'from-pink-50 to-pink-200',
  },
  sub: {
    label: 'sub',
    chip: 'border-purple-500 bg-purple-500/5 text-purple-400/70',
    frame: 'border-purple-500',
    header: 'border-slate-800 from-purple-400 to-purple-900',
    body: 'from-purple-50 to-purple-200',
  },
  follower: {
    label: 'follower',
    chip: 'border-emerald-500 bg-emerald-500/5 text-emerald-400/70',
    frame: 'border-emerald-500',
    header: 'border-slate-800 from-emerald-400 to-emerald-900',
    body: 'from-emerald-50 to-emerald-200',
  },
  viewer: {
    label: 'viewer',
    chip: 'border-blue-500 bg-blue-500/5 text-blue-400/70',
    frame: 'border-blue-500',
    header: 'border-slate-800 from-blue-400 to-blue-900',
    body: 'from-blue-50 to-blue-200',
  },
} satisfies Record<ChatRole, ChatRoleStyle>;

export const resolveChatRole = (flags: ChatRoleFlags): ChatRole =>
  CHAT_ROLE_RULES.find((rule) => rule.matches(flags))?.role ?? 'viewer';
