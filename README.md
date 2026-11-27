# Chance Club

A cross-platform party-game app built with Expo + React Native (Android/iOS/web) and a Laravel JSON API. The original static website remains untouched.

## What is here

- `frontend/` — bilingual English/Arabic UI with RTL, light/dark themes, accessible local play, guest or account sessions, invite-code/link lobbies, readiness, synchronized rounds, private voting/answers, and 11 games.
- `backend/` — Laravel API with hashed account and guest tokens, identity-bound lobbies, host controls, server-generated outcomes, private submissions, and persistent lobby scores.
- `backend/database/migrations/` — app schema. No existing MySQL schemas are modified by the app migrations.

## Local development

On this PC, MySQL `chance_club` is provisioned with a dedicated app account and the Laravel migrations are applied. `backend/.env` is local-only, ignored, and intentionally omitted from the source archive; never share it or configure Laravel with the MySQL root account.

For a new environment:
1. Inspect phpMyAdmin and confirm `chance_club` is not already in use. The SQL template at `backend/database/provision_mysql.sql` creates the isolated schema and restricted app account; replace its example password with a unique random secret.
2. Copy `backend/.env.example` to `backend/.env`, set the dedicated database credentials, then run `php artisan key:generate` and `php artisan migrate` from `backend/`.
3. Start the API from `backend/`: `php artisan serve --host=0.0.0.0 --port=8000`.
4. Set `EXPO_PUBLIC_API_URL` in `frontend/.env` to `http://YOUR-LAN-IP:8000/api/v1` for devices on your Wi-Fi (default is localhost for web), then run `npm run web` or `npx expo start` from `frontend/`.

Quick play and locally cached settings remain available offline; shared lobbies require the API. Guests choose a display name and get a server-issued 30-day token stored on the device. Registration is optional; signing up or signing in from that guest session transfers its lobby memberships and scores to the account. The web invite link is based on the address used to open the app, so a `localhost` link only works on the same device.

For friends on the same Wi-Fi, run the API on `0.0.0.0`, set `EXPO_PUBLIC_API_URL` to the PC's LAN IP, and open the web app from that LAN address so its invite link is reachable. Friends outside the local network need a publicly reachable frontend and API over HTTPS, a production database, password recovery/email verification, monitoring, and a hardened deployment. Nothing has been deployed publicly. Multiplayer updates currently poll every two seconds rather than using WebSockets/push.

## Checks

- Multiplayer API feature tests (separate account/guest sessions, privacy, permissions, and duplicate actions): `cd backend && php artisan test --filter=ChanceClubApiTest`
- Frontend types and lint: `cd frontend && npx tsc --noEmit` and `npx expo lint`
- MySQL schema: the multiplayer migration was applied and inspected on the dedicated local schema; feature behavior tests run against isolated SQLite.
- Review `npm audit` before production; dependency updates were outside this multiplayer change.
