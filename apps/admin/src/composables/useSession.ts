import { computed } from 'vue';
import { useGetSessionMe } from '@/api/generated/auth/auth';

export const useSessionQuery = () => {
  const query = useGetSessionMe();

  return {
    ...query,
    // The generated hook resolves to the whole tagged response rather than to `SessionMe`
    // directly, so the session only exists on a 200 - a 401/500 body carries no login.
    // No fallback to a hardcoded name: a header that says "LuckyFoxCode" while a different
    // account is signed in is a lie, and an empty header is merely unhelpful.
    login: computed(() => {
      const response = query.data.value;
      return response?.status === 200 ? response.data.login : '';
    }),
  };
};
