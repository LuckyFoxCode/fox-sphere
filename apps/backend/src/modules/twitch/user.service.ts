import { prisma } from "../../shared/lib/prisma.js";

export class UserService {
  private verifiedUsersCache = new Set<string>();
  private xpCooldownCache = new Map<string, number>();

  public async findOrCreateUser(twitchId: string, username: string) {
    if (this.verifiedUsersCache.has(twitchId)) return;

    try {
      let user = await prisma.user.findUnique({
        where: { twitchId },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            twitchId,
            username,
          },
        });
      }

      console.log(
        `🆕 [UserService] Создан новый пользователь: ${username} (ID: ${twitchId})`,
      );

      this.verifiedUsersCache.add(twitchId);

      return user;
    } catch (error) {
      console.error(
        "❌ [UserService] Ошибка при поиске/создании пользователя:",
        error,
      );
      throw error;
    }
  }

  public async addXpForMessage(
    twitchId: string,
    xpAmount: number,
  ): Promise<void> {
    const now = Date.now();
    const lastXpTime = this.xpCooldownCache.get(twitchId) || 0;
    const COOLDOWN_MS = 15 * 1000;

    if (now - lastXpTime < COOLDOWN_MS) return;
    try {
      await prisma.user.update({
        where: { twitchId },
        data: {
          xp: {
            increment: xpAmount,
          },
        },
      });

      this.xpCooldownCache.set(twitchId, now);
      console.log(`✨ [XP] Пользователю ${twitchId} начислено +${xpAmount} XP`);
    } catch (error) {
      console.error("❌ Ошибка при начислении XP:", error);
    }
  }

  public clearCache(): void {
    this.verifiedUsersCache.clear();
    console.log("🧹 [UserService] Кэш пользователей очищен.");
  }
}
