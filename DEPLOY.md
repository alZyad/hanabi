# Deploy to Vercel (CLI, from working tree)

Project: `hanabi` (scope: alzyads-projects). Prod alias: https://hanabi-zeta-tan.vercel.app
Token: read from scratchpad file `vercel-token` (ask user for a new one at https://vercel.com/account/tokens if missing).

Pre-flight (run before every prod deploy — reproduces what Vercel's `next build` checks):

```sh
yarn preflight   # next lint (incl. prettier/prettier rule) + tsc --noEmit
```

Vercel's build is `next build`, which runs `next lint` + type-checking with this repo's `.eslintrc.js`. Notes:
- prettier is pinned to an exact version so local formatting matches Vercel's install; a caret (`^`) reintroduces drift where local passes but the build fails.
- `yarn lint` uses a broader glob than `next lint` and can over-report — trust `yarn preflight`.
- If `next lint` reports errors the CLI (`npx prettier --check`) disagrees with, the ESLint cache is stale after a dep change: `rm -rf .next/cache/eslint`.

Deploy current working tree to production (no git push needed):

```sh
export VERCEL_TOKEN=$(cat <path>/vercel-token)
npx --yes vercel@latest deploy --prod --yes --token="$VERCEL_TOKEN"
```

## Notes

- Env vars already set on the project (NEXT_PUBLIC_FIREBASE_*, COOKIE_PASSWORD, analytics). To add/update:

  ```sh
  printf '%s' "<value>" | npx --yes vercel@latest env add <NAME> production --force --token="$VERCEL_TOKEN"
  ```

- Config lives in vercel.json. Build uses pnpm + `npm run build` (has --openssl-legacy-provider).
- First-time only: `npx vercel@latest link --yes --project hanabi --token="$VERCEL_TOKEN"`.
- Verify live: `curl -sko /dev/null -w '%{http_code}' https://hanabi-zeta-tan.vercel.app` (expect 200)
