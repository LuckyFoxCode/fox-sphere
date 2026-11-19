import { z } from "zod";

// Тело запроса агента музыки. Ответов у этого роута нет, поэтому `.openapi()`
// здесь не нужен: маршрут не попадает в спек админки.
export const MusicNowPlayingSchema = z.object({
  title: z.string().min(1),
  artist: z.string(),
  album: z.string().nullable(),
  // data URL с обложкой. Потолок с запасом: агент ужимает всё, что больше
  // 200 КБ бинарника, то есть примерно 270 000 символов base64.
  artwork: z.string().max(700_000).nullable(),
  durationMs: z.number().int().nonnegative(),
  positionMs: z.number().int().nonnegative(),
  isPlaying: z.boolean(),
  sentAt: z.number().int().nonnegative(),
});

export const MusicStateRequestSchema = z.object({
  state: MusicNowPlayingSchema.nullable(),
});

export type MusicNowPlayingDto = z.infer<typeof MusicNowPlayingSchema>;
