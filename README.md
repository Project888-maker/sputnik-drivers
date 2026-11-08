# Sputnik Delivery Ltd: driver recruiting

- `/`: public sign-up page for drivers. Ads link here with `?src=g<group>-a<ad>`, so every
  application shows which Facebook group and which ad it came from. Applications are saved to
  Postgres (Neon) and sent to Telegram with a WhatsApp button.
- `/admin`: private posting planner. Tap "Send me a fresh link" and a signed 90-day link
  arrives on Telegram. It picks today's groups (max 10 a day, 4 minutes apart, the same
  group at most every 7 days), rotates the ads, and tracks which groups and ads bring drivers.
  **Nothing is posted automatically**: you paste and post each ad yourself.

Edit the offer, WhatsApp number, Facebook link and starter ads in `src/content/sputnik.ts`.

## Environment variables (Vercel)

| Name | What |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string. Tables are created on first use. |
| `TELEGRAM_BOT_TOKEN` | Bot that messages you about new drivers |
| `TELEGRAM_CHAT_ID` | Your chat id with that bot |
| `PLANNER_SECRET` | Long random string; signs the planner links |
| `SITE_URL` | `https://sputnik-drivers.vercel.app`, later `https://sputnikdelivery.co.uk` |

## Run locally

```bash
npm install
npm run dev
```
