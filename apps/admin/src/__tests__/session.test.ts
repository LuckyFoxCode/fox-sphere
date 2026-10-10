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

describe('installSession', () => {
  it('sends the browser to the Twitch login on a 401', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const original = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 401 }));

    window.fetch = original;
    const { installSession } = await import('../lib/session');
    installSession();

    await window.fetch('/api/channels');

    expect(assign).toHaveBeenCalledWith('/api/auth/twitch/login');
  });

  it('leaves the request alone when the API is not 401', async () => {
    const original = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 200 }));

    window.fetch = original;
    const { installSession } = await import('../lib/session');
    installSession();

    const response = await window.fetch('/api/channels');

    expect(assign).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});

describe('logout', () => {
  it('posts to the logout route and then returns to login', async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 200 }));
    window.fetch = fetchMock;

    const { logout } = await import('../lib/session');
    await logout();

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/twitch/logout', { method: 'POST' });
    expect(assign).toHaveBeenCalledWith('/api/auth/twitch/login');
  });
});
