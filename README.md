# Web3 Vacancy Parser for Telegram

English-language Telegram bot that sends Web3 vacancies for Community Managers, Moderators, Ambassadors, and Designers.

## What it does

- Scans Web3-native job boards and ecosystem/portfolio job boards.
- Rotates source batches for fast searches instead of waiting on every source.
- De-duplicates vacancies per recipient.
- Shows company, role category, location, and source link.
- Limits bot access to the first two Telegram chats that send `/start` after access control is enabled.
- Sends a daily digest at 10:00 Europe/Moscow through GitHub Actions.

## Commands

- `/start` — activate one of the two allowed chat slots.
- `/now` — search the next source batch immediately.
- `/sources` — show configured sources.
- `/id` — show your Telegram chat ID.

## Stack

- [Telegram Serverless](https://core.telegram.org/bots/serverless) for the bot, webhook, code, and database.
- GitHub Actions only as the cloud scheduler. The bot does not require a running PC.

## Set up the daily digest

1. In BotFather, open your bot → **Serverless** → **CLI Access** → create/copy an access token.
2. In the GitHub repository: **Settings → Secrets and variables → Actions → New repository secret**.
3. Set the secret name to `TGCLOUD_TOKEN` and paste the CLI token as its value.
4. Open **Actions → Daily Web3 vacancy digest → Run workflow** once to test it.

The workflow runs at `07:00 UTC`, which is `10:00 Europe/Moscow` (UTC+3). GitHub may delay scheduled workflows by a few minutes during platform load.

## Security

- Never commit the BotFather bot token or the Serverless CLI token.
- `.tgcloud/`, `.env*`, logs, and `node_modules/` are ignored.
- The bot access limit is stored in Telegram Serverless database, not in the public repository.
