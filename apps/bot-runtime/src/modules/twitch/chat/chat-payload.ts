import { config } from "@fox-sphere/backend-shared";
import { HeroRef, TwitchChatMessagePayload } from "@fox-sphere/types";
import type { ChatUser } from "@twurple/chat";

/**
 * The subset a Twurple message exposes that the payload builder reads.
 *
 * Both paths have to satisfy it, and they are not the same class: the regular
 * path is handed a `ChatMessage`, the viewer-milestone path a `UserNotice`.
 * Typing the input as `ChatMessage` would reject the milestone caller for the
 * extra members it lacks, so the builder declares only what it uses.
 */
export interface ChatMessageSource {
  id: string;
  date: Date;
  userInfo: ChatUser;
  emoteOffsets: Map<string, string[]>;
  isHighlight?: boolean;
}

export interface ChatMessageUserData {
  lvl: number;
  isPermanentVip: boolean;
  isFounder: boolean;
  hero: HeroRef;
}

export interface ChatMessageContext {
  msg: ChatMessageSource;
  username: string;
  text: string;
  isAction: boolean;
  isFollower: boolean;
  userData: ChatMessageUserData | null;
  badges: string[];
  watchStreak?: {
    value: number;
    reward: number;
  };
  isBot?: boolean;
  isHighlight?: boolean;
}

/**
 * Single source for the `chat:message` payload the overlay consumes.
 *
 * The regular message path and the viewer-milestone path built this object twice,
 * field for field. They are not the same payload: a milestone is not a bot, not an
 * action and not a highlight, and the milestone caller says so explicitly rather
 * than letting the shared builder derive those three from `msg`. `isBot` and
 * `isHighlight` are therefore overridable, and the milestone path overrides both.
 */
export const buildChatMessagePayload = (
  ctx: ChatMessageContext,
): TwitchChatMessagePayload => ({
  id: ctx.msg.id,
  userId: ctx.msg.userInfo.userId,
  username: ctx.username,
  displayName: ctx.msg.userInfo.displayName,
  color: ctx.msg.userInfo.color || "#9146FF",
  text: ctx.text,
  badges: ctx.badges,
  emotes: Object.fromEntries(ctx.msg.emoteOffsets),
  timestamp: ctx.msg.date.getTime(),
  userLvl: ctx.userData?.lvl ?? 1,
  isFollower: ctx.isFollower,
  hero: ctx.userData?.hero,
  isMod: ctx.msg.userInfo.isMod,
  isSubscriber: ctx.msg.userInfo.isSubscriber,
  isVip: ctx.msg.userInfo.isVip,
  isBroadcaster: ctx.msg.userInfo.isBroadcaster,
  isBot: ctx.isBot ?? ctx.msg.userInfo.userId === config.twitch.botId,
  isPermanentVip: ctx.userData?.isPermanentVip ?? false,
  isFounder: ctx.userData?.isFounder ?? false,
  // `isHighlight` is absent on `UserNotice`, and its only caller that can omit
  // `isHighlight` on the context overrides it — so this fallback is unreachable.
  isHighlight: ctx.isHighlight ?? ctx.msg.isHighlight ?? false,
  isAction: ctx.isAction,
  // Spread rather than `watchStreak: ctx.watchStreak` so the key stays absent on a
  // regular message, exactly as it was before this builder existed.
  ...(ctx.watchStreak ? { watchStreak: ctx.watchStreak } : {}),
});
