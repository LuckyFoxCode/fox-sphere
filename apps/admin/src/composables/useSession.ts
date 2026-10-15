import { computed } from 'vue';
import { useGetSessionMe } from '@/api/generated/auth/auth';

/**
 * What the panel knows about the signed-in admin.
 *
 * - `loading` — the answer is not in yet.
 * - `admin`   — 200, and `login` holds the Twitch name.
 * - `guest`   — 401, nobody is signed in. This is a normal state, not a failure.
 * - `error`   — 500, or `apps/api` is unreachable. Deliberately distinct from `guest`: an empty
 *               allowlist and a broken backend must not look the same, or the panel offers a
 *               Login button against an API that is not there to accept it.
 */
export type SessionState = 'loading' | 'admin' | 'guest' | 'error';

export const useSessionQuery = () => {
  const query = useGetSessionMe({
    // Only about the unreachable case. A 401 arrives as an ordinary resolved response, because
    // orval turns every status into data rather than throwing, so the default policy already
    // spends exactly one request on it. When `apps/api` is down the fetch really does reject,
    // and then the default three retries with backoff hold the panel in `loading` for seconds.
    // This is what makes a dead backend show up as `error` straight away.
    query: { retry: false },
  });

  return {
    ...query,
    // No fallback to a hardcoded name: a header that says "LuckyFoxCode" while a different
    // account is signed in is a lie, and an empty header is merely unhelpful.
    //
    // The Twitch display name rather than the login: the login is the handle Twitch assigns
    // ("luckyfoxcode"), while the display name is what the person calls themselves
    // ("LuckyFoxCode"). The API already falls back to the login when there is no display name,
    // so this reads one field instead of deciding between two here.
    login: computed(() => {
      const response = query.data.value;
      return response?.status === 200 ? response.data.login : '';
    }),
    displayName: computed(() => {
      const response = query.data.value;
      return response?.status === 200 ? response.data.displayName : '';
    }),
    sessionState: computed<SessionState>(() => {
      // A 5xx arrives as an ordinary tagged response, while an unreachable `apps/api` rejects
      // the query outright. Both mean "we do not know", and neither means "nobody is here".
      if (query.isError.value) return 'error';

      const response = query.data.value;
      if (!response) return 'loading';
      if (response.status === 200) return 'admin';
      if (response.status === 401) return 'guest';

      return 'error';
    }),
  };
};
