import type { TwitchChatMessagePayload } from '@fox-sphere/types';
import { ref } from 'vue';

export interface ActiveHero {
  userId: string;
  username: string;
  heroId: string;
  timeoutId: ReturnType<typeof setTimeout>;
  userLvl?: number;
  userColor?: string;
  userDisplayName?: string;
  isMod?: boolean;
  isVip?: boolean;
  isFollower?: boolean;
  isFounder?: boolean;
  isSubscriber?: boolean;
  isBroadcaster?: boolean;
  isBot?: boolean;
  message?: string;
  messageEmotes?: TwitchChatMessagePayload['emotes'];
  messageTimeoutId?: ReturnType<typeof setTimeout>;
}

const HERO_TTL = 5 * 60 * 1000;
const MESSAGE_TTL = 8000;

const activeHeroes = ref(new Map<string, ActiveHero>());

const setMessage = (hero: ActiveHero, data: TwitchChatMessagePayload): void => {
  hero.message = data.text;
  hero.messageEmotes = data.emotes;

  if (hero.messageTimeoutId) {
    clearTimeout(hero.messageTimeoutId);
  }

  hero.messageTimeoutId = setTimeout(() => {
    hero.message = undefined;
    hero.messageEmotes = undefined;
  }, MESSAGE_TTL);
};

export function useHeroOverlay() {
  const applyViewerFlags = (hero: ActiveHero, data: TwitchChatMessagePayload): void => {
    hero.userLvl = data.userLvl;
    hero.userDisplayName = data.displayName;
    hero.userColor = data.color;
    hero.isMod = data.isMod;
    hero.isSubscriber = data.isSubscriber;
    hero.isVip = data.isVip || data.isPermanentVip;
    hero.isBroadcaster = data.isBroadcaster;
    hero.isBot = data.isBot;
    hero.isFollower = data.isFollower;
    hero.isFounder = data.isFounder;
  };

  const removeHeroFromLane = (userId: string): void => {
    const existing = activeHeroes.value.get(userId);

    if (!existing) return;

    clearTimeout(existing.timeoutId);

    if (existing.messageTimeoutId) {
      clearTimeout(existing.messageTimeoutId);
    }

    activeHeroes.value.delete(userId);
  };

  const handleHeroMessage = (data: TwitchChatMessagePayload): void => {
    const hero = data.hero;

    if (!hero) return;

    const existing = activeHeroes.value.get(data.userId);

    if (existing) {
      clearTimeout(existing.timeoutId);
      applyViewerFlags(existing, data);
      existing.timeoutId = setTimeout(() => removeHeroFromLane(data.userId), HERO_TTL);
      setMessage(existing, data);
      return;
    }

    const created: ActiveHero = {
      userId: data.userId,
      username: data.username,
      heroId: hero.heroId,
      timeoutId: setTimeout(() => removeHeroFromLane(data.userId), HERO_TTL),
    };

    activeHeroes.value.set(data.userId, created);
    applyViewerFlags(created, data);
    setMessage(created, data);
  };

  return { activeHeroes, handleHeroMessage, removeHeroFromLane };
}
