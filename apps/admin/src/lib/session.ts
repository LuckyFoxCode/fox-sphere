const LOGIN_PATH = '/api/auth/twitch/login';

/**
 * Sends the browser to the Twitch login when the API says there is no session.
 *
 * This replaces `installAdminKey`, which attached an `X-Admin-Key` header because the generated
 * client could not carry it: `src/api/generated/` is orval output, committed, and CI asserts
 * `pnpm gen:api` is byte-identical, so a header added there would be overwritten. Wrapping
 * `window.fetch` once keeps that seam, and the session cookie needs no wrapper at all - the
 * browser attaches it by itself on same-origin requests.
 */
export const installSession = () => {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);

    if (response.status === 401) {
      window.location.assign(LOGIN_PATH);
    }

    return response;
  };
};

export const logout = async () => {
  await fetch('/api/auth/twitch/logout', { method: 'POST' });
  window.location.assign(LOGIN_PATH);
};
