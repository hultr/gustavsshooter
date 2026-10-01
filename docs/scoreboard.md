# Shared scoreboard

The game keeps a top 10 for each map (`range`, `monsters`). An entry is tiny:
`{ name, score, time, wave, date }`. Where it is stored is set in `js/scores-config.js`:

```js
GS.SCORE_CONFIG = { backend: 'local', url: '', key: '' };
```

With `local` (the default) the scores stay in the browser on that computer. To share one
board between everyone who plays, pick one of the online options below and fill in the
config. If the online board can't be reached, the game quietly falls back to the local one.

All three work from a plain `index.html` opened as a file, from a local web server and from
any hosting (GitHub Pages, itch.io), because they allow cross-origin requests.

**Cheating:** the game sends the score itself, so anyone who knows how can send a fake score.
The rules below limit names to 20 characters and scores to 0–10,000,000, and stop entries
from being changed or deleted. Fine for family and friends; not for prizes.

---

## Option A: Firebase Realtime Database (recommended)

Free "Spark" plan: 1 GB stored, 10 GB downloaded per month, 100 simultaneous connections –
far more than a scoreboard needs. Never sleeps. Needs a Google account.

1. Go to <https://console.firebase.google.com>, *Add project* (Analytics not needed).
2. *Build → Realtime Database → Create database*, pick a location, start in **locked mode**.
3. On the *Rules* tab paste this and *Publish*:

   ```json
   {
     "rules": {
       "scores": {
         "$board": {
           ".read": "$board === 'range' || $board === 'monsters'",
           ".indexOn": ["score"],
           "$id": {
             ".write": "!data.exists()",
             ".validate": "newData.child('name').isString() && newData.child('name').val().length <= 20 && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 10000000"
           }
         }
       }
     }
   }
   ```

4. Copy the database URL shown at the top of the *Data* tab into the config:

   ```js
   GS.SCORE_CONFIG = { backend: 'firebase', url: 'https://<project>-default-rtdb.<region>.firebasedatabase.app' };
   ```

No key is needed – the rules decide what is allowed.

## Option B: Google Sheet + Apps Script

Free with a Google account, and the scores end up in a spreadsheet you can read and edit
by hand. A bit slower (about a second per request).

1. Create a Google Sheet. *Extensions → Apps Script*, replace the code with:

   ```js
   const BOARDS = ['range', 'monsters'];
   function sheet() {
     const ss = SpreadsheetApp.getActive();
     return ss.getSheetByName('scores') || ss.insertSheet('scores');
   }
   function out(data) {
     return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
   }
   function doGet(e) {
     const board = String(e.parameter.board || '');
     const rows = sheet().getDataRange().getValues()
       .filter(r => r[0] === board)
       .map(r => ({ name: r[1], score: r[2], time: r[3], wave: r[4], date: String(r[5]) }))
       .sort((a, b) => b.score - a.score)
       .slice(0, 10);
     return out(rows);
   }
   function doPost(e) {
     const { board, entry } = JSON.parse(e.postData.contents);
     if (!BOARDS.includes(board)) return out({ error: 'bad board' });
     const name = String(entry.name || '').slice(0, 20);
     const score = Math.max(0, Math.min(10000000, Math.round(Number(entry.score) || 0)));
     const lock = LockService.getScriptLock();
     lock.waitLock(5000);
     sheet().appendRow([board, name, score, Number(entry.time) || 0, Number(entry.wave) || 0, new Date().toISOString()]);
     lock.releaseLock();
     return out({ ok: true });
   }
   ```

2. *Deploy → New deployment → Web app*, *Execute as: Me*, *Who has access: Anyone*. Allow
   the permissions it asks for, and copy the web app URL (ends in `/exec`):

   ```js
   GS.SCORE_CONFIG = { backend: 'appsscript', url: 'https://script.google.com/macros/s/<id>/exec' };
   ```

When you change the script later, use *Manage deployments → Edit → New version* so the URL
stays the same.

## Option C: Supabase

A real Postgres database with a free plan (500 MB). **The free project pauses after 7 days
without any requests** and has to be woken up in the dashboard, so it suits a game that is
played every week.

1. Create a project at <https://supabase.com>.
2. In the *SQL editor* run:

   ```sql
   create table scores (
     id bigint generated always as identity primary key,
     board text not null check (board in ('range', 'monsters')),
     name text not null check (char_length(name) between 1 and 20),
     score integer not null check (score between 0 and 10000000),
     time integer not null default 0,
     wave integer not null default 0,
     date timestamptz not null default now()
   );
   alter table scores enable row level security;
   create policy "anyone can read" on scores for select to anon using (true);
   create policy "anyone can add" on scores for insert to anon with check (true);
   ```

3. From *Project Settings → API* copy the project URL and the **anon public** key (never the
   service role key):

   ```js
   GS.SCORE_CONFIG = { backend: 'supabase', url: 'https://<project>.supabase.co', key: '<anon key>' };
   ```

## Other options looked at

- **Cloudflare Workers + KV** – free (100,000 reads and 1,000 writes a day) and fast, but you
  write and deploy a small Worker yourself. Good if you already use Cloudflare.
- **dreamlo.com** – a free no-signup leaderboard service made for games, but HTTPS (needed for
  itch.io or any https site) requires a donation, and anyone with the URL can add scores.
- **A GitHub Gist or repository file** – free, but writing needs a GitHub token in the game,
  which anyone could copy and misuse. Not recommended.
