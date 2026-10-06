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
export const MESSAGE_TTL = 8000;

const activeHeroes = ref(new Map<string, ActiveHero>());

/**
 * Resolves the entry through the map rather than taking it as an argument.
 *
 * `ref(Map)` returns a reactive *proxy* on `get`, while `set` stores the raw object. Holding
 * on to the raw object and mutating it writes straight to the target, bypassing the proxy's
 * `set` trap — so no trigger fires and the bubble never clears. That is exactly what a
 * captured `setTimeout` closure would do, so both here and in the expiring callback the
 * entry is looked up by `userId` again.
 */
const setMessage = (userId: string, data: TwitchChatMessagePayload): void => {
  const hero = activeHeroes.value.get(userId);

  if (!hero) return;

  hero.message = data.text;
  hero.messageEmotes = data.emotes;

  if (hero.messageTimeoutId) {
    clearTimeout(hero.messageTimeoutId);
  }

  hero.messageTimeoutId = setTimeout(() => {
    const expiring = activeHeroes.value.get(userId);

    if (!expiring) return;

    expiring.message = undefined;
    expiring.messageEmotes = undefined;
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

      // Same reason the flags above are refreshed: this viewer keeps one `ActiveHero` for
      // HERO_TTL, so a hero changed in the database would otherwise stay invisible until
      // they fell out of the lane and came back.
      existing.heroId = hero.heroId;

      existing.timeoutId = setTimeout(() => removeHeroFromLane(data.userId), HERO_TTL);
      setMessage(data.userId, data);
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
    setMessage(data.userId, data);
  };

  return { activeHeroes, handleHeroMessage, removeHeroFromLane };
}
