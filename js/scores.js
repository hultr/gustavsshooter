// Scoreboard: the top 10 of each map, shared online when js/scores-config.js points at a
// backend, otherwise kept in this browser. Entries are tiny: { name, score, time, wave, date }.
// If the online board can't be reached the game falls back to the local one.
window.GS = window.GS || {};

GS.Scores = (function () {
  const TOP = 10, MAX_NAME = 20;
  const cfg = GS.SCORE_CONFIG || { backend: 'local' };

  // Olle gets his own title, whatever case he types it in
  const OLLE = ['olle', 'olle munther', 'olle munter', 'munther', 'munter'];
  function cleanName(raw) {
    const name = String(raw || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
    if (OLLE.includes(name.toLowerCase())) return 'Olle-wan CE nobi';
    return name || 'Anonymous';
  }

  const sortTop = list => list
    .filter(e => e && Number.isFinite(+e.score))
    .map(e => ({ name: cleanName(e.name), score: Math.round(+e.score), time: +e.time || 0, wave: +e.wave || 0, date: e.date || '' }))
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, TOP);

  // ---------- backends: list(board) -> entries, add(board, entry) ----------
  const local = {
    async list(board) { try { return JSON.parse(localStorage.getItem('scores-' + board)) || []; } catch (e) { return []; } },
    async add(board, entry) {
      const all = sortTop((await local.list(board)).concat(entry));
      try { localStorage.setItem('scores-' + board, JSON.stringify(all)); } catch (e) {}
    },
  };

  async function json(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  }
  const base = () => cfg.url.replace(/\/+$/, '');
  const supaHeaders = () => ({ apikey: cfg.key, Authorization: 'Bearer ' + cfg.key, 'Content-Type': 'application/json' });

  const remote = {
    // Realtime Database REST API: /scores/<board>/<push id> = entry
    firebase: {
      async list(board) {
        const d = await json(await fetch(`${base()}/scores/${board}.json?orderBy=%22score%22&limitToLast=${TOP}`));
        return d ? Object.values(d) : [];
      },
      async add(board, entry) { await json(await fetch(`${base()}/scores/${board}.json`, { method: 'POST', body: JSON.stringify(entry) })); },
    },
    // PostgREST: table scores(board, name, score, time, wave, date)
    supabase: {
      async list(board) {
        return json(await fetch(`${base()}/rest/v1/scores?select=name,score,time,wave,date&board=eq.${board}&order=score.desc&limit=${TOP}`, { headers: supaHeaders() }));
      },
      async add(board, entry) {
        await json(await fetch(`${base()}/rest/v1/scores`, { method: 'POST', headers: Object.assign(supaHeaders(), { Prefer: 'return=minimal' }), body: JSON.stringify(Object.assign({ board }, entry)) }));
      },
    },
    // Apps Script web app: GET ?board=x lists, POST {board, entry} adds. text/plain avoids a
    // CORS preflight, which Apps Script can't answer.
    appsscript: {
      async list(board) { return json(await fetch(`${cfg.url}?board=${encodeURIComponent(board)}`)); },
      async add(board, entry) { await json(await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ board, entry }) })); },
    },
  }[cfg.backend];

  let online = !!(remote && cfg.url);
  const status = () => (online ? 'online' : 'local');

  async function list(board) {
    if (online) {
      try { return sortTop(await remote.list(board)); } catch (e) { console.warn('Scoreboard offline, using local scores:', e.message); online = false; }
    }
    return sortTop(await local.list(board));
  }

  // Would this score get onto the board?
  async function qualifies(board, score) {
    if (!(score > 0)) return false;
    const top = await list(board);
    return top.length < TOP || score > top[top.length - 1].score;
  }

  // Save a score; returns the new top list and the saved entry (to highlight it)
  async function submit(board, { name, score, time = 0, wave = 0 }) {
    const entry = { name: cleanName(name), score: Math.max(0, Math.round(score)), time: Math.round(time), wave, date: new Date().toISOString() };
    if (online) {
      try { await remote.add(board, entry); } catch (e) { console.warn('Could not save online, saving locally:', e.message); online = false; }
    }
    if (!online) await local.add(board, entry);
    return { top: await list(board), entry };
  }

  return { list, qualifies, submit, cleanName, status, TOP };
})();
