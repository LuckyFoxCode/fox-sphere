import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({
  data: undefined as { status: number; data?: { login: string } } | undefined,
  isError: false,
  options: undefined as { query?: { retry?: boolean } } | undefined,
}));

// The generated hook is the only thing that touches the network; the composable's job is what
// it does with whatever the API answered. Its options are captured because the retry policy is
// part of that contract and nothing else asserts it.
vi.mock('@/api/generated/auth/auth', () => ({
  useGetSessionMe: (options?: { query?: { retry?: boolean } }) => {
    session.options = options;
    return { data: ref(session.data), isError: ref(session.isError) };
  },
}));

const { useSessionQuery } = await import('../useSession');

beforeEach(() => {
  session.data = undefined;
  session.isError = false;
});

describe('useSessionQuery', () => {
  it('exposes the login of the signed-in admin', () => {
    session.data = { status: 200, data: { login: 'luckyfoxcode' } };

    expect(useSessionQuery().login.value).toBe('luckyfoxcode');
  });

  it('shows nothing rather than a stale name when there is no session', () => {
    session.data = { status: 401 };

    expect(useSessionQuery().login.value).toBe('');
  });

  it('does not retry, so an unreachable apps/api surfaces as error at once', () => {
    // Not about 401: orval resolves every status as data, so the default policy already costs
    // exactly one request there. This is about the fetch rejecting outright.
    useSessionQuery();

    expect(session.options?.query?.retry).toBe(false);
  });
});

describe('sessionState', () => {
  it('is admin on a 200', () => {
    session.data = { status: 200, data: { login: 'luckyfoxcode' } };

    expect(useSessionQuery().sessionState.value).toBe('admin');
  });

  it('is guest on a 401 - a signed-out browser is a normal state', () => {
    session.data = { status: 401 };

    expect(useSessionQuery().sessionState.value).toBe('guest');
  });

  it('is loading while the answer is not in yet', () => {
    expect(useSessionQuery().sessionState.value).toBe('loading');
  });

  it('is error on a 500, never guest', () => {
    // A broken backend and an empty allowlist must not look alike. Rendering a guest view here
    // would put a working-looking panel in front of an empty database.
    session.data = { status: 500 };

    expect(useSessionQuery().sessionState.value).toBe('error');
  });

  it('is error when the query itself fails, because apps/api is unreachable', () => {
    session.isError = true;

    expect(useSessionQuery().sessionState.value).toBe('error');
  });
});
