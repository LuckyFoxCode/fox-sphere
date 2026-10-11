const LOGIN_PATH = '/api/auth/twitch/login';

/**
 * Starts the Twitch login as a top-level navigation, never through the generated client.
 *
 * `/api/auth/twitch/login` answers with a 302 into Twitch's HTML page, which the generated
 * parser throws on when a `fetch` follows it. That is also why the route is absent from the
 * spec - see `.agents/rules/openapi-routes.md`, "What stays outside the spec".
 */
export const login = () => {
  window.location.assign(LOGIN_PATH);
};

/**
 * Clears the session cookie, and stops there.
 *
 * There is deliberately no redirect. This used to send the browser straight back into a Twitch
 * window, which meant logging out looked exactly like being logged in by a third party.
 * Staying put is what makes the guest state visible: the sidebar button flips to Login on its
 * own once the session query refetches and sees the 401.
 */
export const logout = async () => {
  await fetch('/api/auth/twitch/logout', { method: 'POST' });
};
