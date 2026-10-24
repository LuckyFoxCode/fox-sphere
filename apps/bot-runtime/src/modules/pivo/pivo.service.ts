import { prisma, resolvePivoOutcome, type PivoOutcome } from "@fox-sphere/backend-shared";
import { getGoldenBeerTier } from "@fox-sphere/types";
import { requireChannelUser } from "../channel";

export type PivoRoll =
  | { outcome: "regular" }
  | {
      outcome: "golden";
      goldenBeers: number;
      tier: number;
      isNewTier: boolean;
    };

export class PivoService {
  // Инъекция исхода — ради теста: заставить выпасть золото иначе можно только моком глобала.
  constructor(private resolveOutcome: () => PivoOutcome = resolvePivoOutcome) {}

  /**
   * Бросок первым, запись — только если выпало золото: 95% вызовов не трогают базу вовсе.
   *
   * `increment` возвращает новое значение одним атомарным UPDATE, поэтому два дропа подряд
   * не могут прочитать одно и то же число и оба объявить себя новой ступенью.
   */
  public async roll(twitchId: string): Promise<PivoRoll> {
    if (this.resolveOutcome() === "regular") return { outcome: "regular" };

    const channelUser = await requireChannelUser(twitchId);

    const updated = await prisma.channelUser.update({
      where: { id: channelUser.id },
      data: { goldenBeers: { increment: 1 } },
      select: { goldenBeers: true },
    });

    const tier = getGoldenBeerTier(updated.goldenBeers);

    return {
      outcome: "golden",
      goldenBeers: updated.goldenBeers,
      tier,
      isNewTier: tier > getGoldenBeerTier(updated.goldenBeers - 1),
    };
  }
}
