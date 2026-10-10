import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({
  data: undefined as { status: number; data?: { login: string } } | undefined,
}));

// The generated hook is the only thing that touches the network; the composable's job is what
// it does with whatever the API answered.
vi.mock('@/api/generated/auth/auth', () => ({
  useGetSessionMe: () => ({ data: ref(session.data) }),
}));

const { useSessionQuery } = await import('../useSession');

beforeEach(() => {
  session.data = undefined;
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

  it('shows nothing while the session is still being fetched', () => {
    expect(useSessionQuery().login.value).toBe('');
  });
});
