/**
 * Turning a tagged response into something renderable.
 *
 * The generated client turns every status into data rather than throwing, so a screen cannot ask
 * "did it fail" by catching - it has to read the status off the payload. These two builders are
 * the single answer to "what do I render", so a status the spec never documented surfaces as a
 * failure instead of an empty screen.
 *
 * Shared by every screen that queries `channel-user`: the overview's leaderboards, the table, and
 * one viewer's detail each render an `AsyncState`, and three copies of this is three places to
 * forget a branch.
 */

export type StatusResponse = { status: number; data?: unknown };

export const failureFrom = (response: StatusResponse | undefined): string | null => {
  if (!response || response.status === 200 || response.status === 404) return null;

  const body = response.data as { message?: string } | undefined;

  return `Request failed (HTTP ${response.status})${body?.message ? `: ${body.message}` : ''}`;
};

export const notFoundFrom = (
  response: StatusResponse | undefined,
  message: string,
): string | undefined => (response?.status === 404 ? message : undefined);