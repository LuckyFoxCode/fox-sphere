import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const assign = vi.fn<(url: string) => void>();

beforeEach(() => {
  assign.mockClear();
  // jsdom's location.assign throws "Not implemented" - replace it with a spy.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { assign },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('login', () => {
  it('starts the OAuth flow as a top-level navigation', async () => {
    const { login } = await import('../lib/session');

    login();

    expect(assign).toHaveBeenCalledWith('/api/auth/twitch/login');
  });
});

describe('logout', () => {
  it('posts to the logout route and stays on the page', async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    window.fetch = fetchMock;

    const { logout } = await import('../lib/session');
    await logout();

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/twitch/logout', { method: 'POST' });
    // The whole point of the guest state: logging out must not throw the user into a Twitch
    // window. The sidebar button flips to Login instead, and the panel stays where it is.
    expect(assign).not.toHaveBeenCalled();
  });
});
