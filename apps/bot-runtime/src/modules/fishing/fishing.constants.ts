export const FISHING_CONFIG = {
  CAST_COOLDOWN_MS: 60_000,
  BITE_DELAY_MIN_MS: 10_000,
  BITE_DELAY_MAX_MS: 30_000,
};

const pickVariant = <T>(variants: readonly T[], index: number): T =>
  variants[index % variants.length] as T;

export const FISHING_MESSAGES = {
  CAST_ACCEPTED: (username: string) => `@${username} забросил удочку…`,
  ALREADY_FISHING: (username: string) => `@${username}, ты уже рыбачишь`,
  CAST_COOLDOWN: (username: string, remainingSeconds: number) =>
    `⏳ @${username}, удочка не готова — через ${remainingSeconds}s`,
  // Сорвалась — это отдельный исход с собственной выплатой (пустой крючок), а не «рыба ушла»:
  // зритель ничего не сделал неправильно, и текст не должен читаться как его промах.
  BITE_DUD: [
    (username: string) => `🎣 @${username} — клюёт, и тут сорвалась с крючка!`,
    (username: string) => `🎣 @${username} — ключит было, но рыба ушла с крючка…`,
    (username: string) => `🎣 @${username} — дёрнуло, леска порвалась, улов ушёл`,
  ],
  BITE_COINS: [
    (username: string, coins: number) => `🎣 @${username} — ключёт и вылавливает! +${coins} монет`,
    (username: string, coins: number) => `🎣 @${username} — вытащил рыбу на +${coins} монет!`,
    (username: string, coins: number) => `🎣 @${username} — на крючке рыба, +${coins} монет 🎉`,
  ],
  BITE_XP: (username: string, xp: number) => `⚡ @${username} — клюёт! Выловил +${xp} XP`,
  // Сундук не платит игроку ничего: 200 монет уходят в общий джекпот. Старая формулировка
  // «+{bank} в банк» читалась как личная выплата — большое число на экране и ноль в кошельке,
  // ровно то расхождение, которое чинится в остальных сообщениях.
  BITE_BANK: (username: string, bank: number) =>
    `🎣 @${username} — ключёт! Вытащил сундук: ${bank} монет ушли в джекпот`,
} as const;

/**
 * Собирает строку улова по разновидности текста. Живёт здесь, а не в команде `!тянуть`,
 * потому что команды больше нет: результат печатает подписчик `fish:bite`, и логика фразы
 * должна быть рядом с остальными текстами, а не внутри удалённого обработчика.
 */
export const fishingCatchMessage = (
  caught: { catchType: string; coinAmount: number; xpAmount: number; bankAmount: number },
  username: string,
  variantIndex: number,
): string => {
  switch (caught.catchType) {
    case "coins":
      return pickVariant(FISHING_MESSAGES.BITE_COINS, variantIndex)(
        username,
        caught.coinAmount,
      );
    case "xp":
      return FISHING_MESSAGES.BITE_XP(username, caught.xpAmount);
    case "bank":
      return FISHING_MESSAGES.BITE_BANK(username, caught.bankAmount);
    default:
      return pickVariant(FISHING_MESSAGES.BITE_DUD, variantIndex)(username);
  }
};
