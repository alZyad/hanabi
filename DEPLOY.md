# Deploy to Vercel (CLI, from working tree)

Project: `hanabi` (scope: alzyads-projects). Prod alias: https://hanabi-zeta-tan.vercel.app
Token: read from scratchpad file `vercel-token` (ask user for a new one at https://vercel.com/account/tokens if missing).

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
