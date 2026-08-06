# ecomonos-watcher

Emails me whenever [Los Ecomonos](https://www.youtube.com/@ecomonos) puts out a new video.

It reads the channel's public RSS feed, so no YouTube API key and nothing to keep under quota. A
GitHub Actions cron checks every 30 minutes and sends the mail through Gmail. All the code lives in
[`src/index.ts`](src/index.ts) — about 80 lines.

## Setup

You need a Gmail app password. The normal account password won't work over SMTP, so turn on
[2-step verification](https://myaccount.google.com/signinoptions/twosv) and then generate one at
[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). It's 16 characters.

Then add two secrets under *Settings → Secrets and variables → Actions*:

- `GMAIL_USER` — the Gmail it sends from
- `GMAIL_APP_PASSWORD` — those 16 characters

Mailing yourself from your own account works fine, it lands in the inbox like anything else.

Kick it off from *Actions → Watch Ecomonos → Run workflow*. The first run won't email you anything;
it just notes which video is the newest right now, otherwise you'd get 15 mails in one go. After
that every upload turns up in your inbox.

## How it knows a video is new

`state/last-seen.json` stores one thing, the date of the last video it saw:

```json
{ "lastPublished": "2026-08-05T18:00:23+00:00" }
```

Anything published after that is new, and the workflow commits the file when it changes.

Dates rather than IDs, because if they go back and edit an old video's title, YouTube shoves it back
into the feed — but its publish date stays old, so nothing gets sent. And if one mail fails halfway
through a batch, the file only records what actually went out, so the rest get retried next time
instead of arriving twice.

## Running it locally

```bash
npm install
export GMAIL_USER='you@gmail.com'
export GMAIL_APP_PASSWORD='abcd efgh ijkl mnop'
export STATE_PATH=/tmp/ecomonos.json   # keeps the repo's real state out of it

npm run build
node dist/index.js   # first time it only saves the starting point
```

To actually get a mail and see it work, backdate the saved file and run it again:

```bash
echo '{"lastPublished":"2026-07-25T00:00:00+00:00"}' > /tmp/ecomonos.json
node dist/index.js
```

## Variables

Only the first two are required.

| Variable | Default |
| --- | --- |
| `GMAIL_USER` | — |
| `GMAIL_APP_PASSWORD` | — |
| `MAIL_TO` | `polresinamartinez@gmail.com` |
| `YOUTUBE_CHANNEL_ID` | `UCyYkUq0qMNP-ea7LEvspkug` (Los Ecomonos) |
| `STATE_PATH` | `state/last-seen.json` |

## Worth knowing

Mail can take up to ~30 minutes, plus however late GitHub feels like being — their cron is
best-effort and skips a run now and then.

GitHub also disables scheduled workflows after 60 days of no activity in the repo. It warns you by
email first, and any commit (or hitting "Run workflow") brings it back.

Shorts and premieres come through the feed as ordinary videos. For a premiere the date is when it
was announced, so you hear about it when it gets scheduled, not when it airs.
