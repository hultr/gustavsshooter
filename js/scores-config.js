// Where the scoreboard is stored. See docs/scoreboard.md for how to set up each option.
//   local      – only on this computer (browser storage); works with no setup
//   firebase   – Firebase Realtime Database:  url: 'https://<project>-default-rtdb.<region>.firebasedatabase.app'
//   supabase   – Supabase table "scores":      url: 'https://<project>.supabase.co', key: '<anon public key>'
//   appsscript – Google Sheet + Apps Script:   url: 'https://script.google.com/macros/s/<id>/exec'
window.GS = window.GS || {};
GS.SCORE_CONFIG = {
  backend: 'firebase',
  url: '', // Firebase Realtime Database URL – until it is filled in, scores stay on this computer
  key: '',
};
