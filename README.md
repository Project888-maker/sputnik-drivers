# Sputnik Delivery Ltd: driver recruiting

- `/`: public sign-up page for drivers. Ads link here with `?src=g<group>-a<ad>`, so every
  application shows which Facebook group and which ad it came from. Applications are saved to
  Postgres (Neon) and sent to Telegram with a WhatsApp button.
- `/admin`: private posting planner. Tap "Send me a fresh link" and a signed 90-day link
  arrives on Telegram. It picks today's groups (max 10 a day, 4 minutes apart, the same
  group at most every 7 days), rotates the ads, and tracks which groups and ads bring drivers.
  **Nothing is posted automatically**: you paste and post each ad yourself.

Every morning at 7am (London) Telegram gets a reminder: groups due today, new drivers
waiting, and a fresh planner link (`/api/cron/reminder`, Vercel Cron).

Edit the offer, WhatsApp number, Facebook link and starter ads in `src/content/sputnik.ts`.

## Environment variables (Vercel)

| Name | What |
|---|---|
| `SPUTNIK_DRIVERS_DATABASE_URL` | Added by Vercel Storage → Neon (or set `DATABASE_URL`). Tables are created on first use. |
| `TELEGRAM_BOT_TOKEN` | Bot that posts new drivers (from @BotFather) |
| `TELEGRAM_CHAT_ID` | Where applications land: the channel, e.g. `@sputnikdrivers` or `-100…` (bot must be a channel admin) |
| `TELEGRAM_ADMIN_CHAT_ID` | Optional: your private chat id, for the planner link |
| `PLANNER_SECRET` | Long random string; signs the planner links |
| `CRON_SECRET` | Random string; Vercel sends it to the 7am reminder so nobody else can trigger it |
| `SITE_URL` | `https://sputnik-drivers.vercel.app`, later `https://sputnikdelivery.co.uk` |

## Run locally

```bash
npm install
npm run dev
```
