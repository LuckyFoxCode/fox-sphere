const ADMIN_KEY_HEADER = 'X-Admin-Key'

/**
 * Sends the admin key with every API call.
 *
 * `src/api/generated/` is produced by orval from `apps/api/openapi.json` and committed, and CI
 * asserts `pnpm gen:api` is byte-identical to what is on disk — so the header cannot be added to
 * the generated fetch calls. Wrapping `window.fetch` once at startup puts it on every request
 * without touching generated output.
 *
 * Both key halves come from Vite env, so neither is written into the bundle by hand. When Twitch
 * OAuth replaces the key, this module and the middleware behind it are deleted together.
 */
export const installAdminKey = () => {
  const adminKey = import.meta.env.VITE_ADMIN_KEY

  if (!adminKey) {
    console.warn(
      '[admin] VITE_ADMIN_KEY is not set - every /api request will come back 401.',
    )
    return
  }

  const originalFetch = window.fetch.bind(window)

  window.fetch = (input, init) =>
    originalFetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        [ADMIN_KEY_HEADER]: adminKey,
      },
    })
}
