/* Registro de leads no Google Sheets. Credenciais exclusivamente no ambiente Netlify. */
const crypto = require('crypto');
const SHEET_ID = '1sJ-4oG_Id5Y9Vdio8qDU7DfwCxih070--s0aAoB-GEI';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
function base64url(value) { return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url'); }
function dataBrasilia() {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()).replace(', ', ' ');
}
async function registrarLead({ nome, email, telefone }) {
  const emailConta = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const chave = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!emailConta || !chave) {
    console.warn('Google Sheets: credenciais não configuradas.');
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: 'RS256', typ: 'JWT' });
  const claims = base64url({ iss: emailConta, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const input = `${header}.${claims}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(input), chave).toString('base64url');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${signature}` }),
    signal: AbortSignal.timeout(8000)
  });
  if (!tokenResponse.ok) throw new Error(`Google OAuth HTTP ${tokenResponse.status}`);
  const { access_token } = await tokenResponse.json();
  if (!access_token) throw new Error('Google OAuth não retornou token');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("'Leads'!A:D")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ majorDimension: 'ROWS', values: [[dataBrasilia(), nome, email, telefone]] }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Google Sheets HTTP ${response.status}`);
  return true;
}
module.exports = { registrarLead };
