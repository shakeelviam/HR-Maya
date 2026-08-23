// ============================================================
// maya-pin-sender.js — send each Maya employee THEIR OWN ID + PIN on WhatsApp
// ------------------------------------------------------------
// Files needed alongside this script:
//   contacts.csv   -> from getPinContactsCsv: number,name,employee_id,pin
//   (message text is built per-person below)
//
//   npm install whatsapp-web.js qrcode-terminal csv-parser
//   node maya-pin-sender.js --dry     # DRY RUN: prints who would get what, sends nothing
//   node maya-pin-sender.js           # LIVE: sends, after you confirm the dry run
//
// SAFETY: always run --dry first and eyeball every number. A wrong number
// sends someone's PIN to a stranger. Use a DEDICATED WhatsApp number; bulk
// automation via whatsapp-web.js is against WhatsApp ToS and can be banned.
// Batches of 20 with a 12-minute cooldown; logs sent rows so re-runs skip them.
// ============================================================

const fs = require('fs');
const path = require('path');
const DRY = process.argv.includes('--dry');

const BATCH_SIZE = 20;
const COOLDOWN_MS = 12 * 60 * 1000;
const MSG_GAP_MS = 4000;
const LOG_FILE = 'sent_log.csv';

function buildMessage(name, id, pin) {
  return `Hey ${name},\n\nThis is a message from Maya HR Department. Your employment ID is ${id} and your pin no is ${pin}. Please do not share it with anyone.`;
}

function readContacts() {
  const raw = fs.readFileSync('contacts.csv', 'utf8').trim().split(/\r?\n/);
  const header = raw.shift().split(',');
  const col = (n) => header.indexOf(n);
  const ci = { num: col('number'), name: col('name'), id: col('employee_id'), pin: col('pin') };
  return raw.map(line => {
    // naive CSV split that respects the single quoted "name" field
    const m = line.match(/^([^,]*),("(?:[^"]|"")*"|[^,]*),([^,]*),(.*)$/);
    if (!m) return null;
    const name = m[2].replace(/^"|"$/g, '').replace(/""/g, '"');
    return { number: m[1].trim(), name: name.trim(), id: m[3].trim(), pin: m[4].trim() };
  }).filter(Boolean);
}

function alreadySent() {
  if (!fs.existsSync(LOG_FILE)) return new Set();
  return new Set(fs.readFileSync(LOG_FILE, 'utf8').split(/\r?\n/).map(l => l.split(',')[0]).filter(Boolean));
}
function logSent(number, id) {
  fs.appendFileSync(LOG_FILE, `${number},${id},${new Date().toISOString()}\n`);
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const contacts = readContacts();
  const sent = alreadySent();
  const pending = contacts.filter(c => !sent.has(c.number));

  console.log(`\n=== Maya PIN Sender ${DRY ? '(DRY RUN — nothing will send)' : '(LIVE)'} ===`);
  console.log(`Total contacts: ${contacts.length} | already sent: ${sent.size} | to send now: ${pending.length}\n`);

  // Preview EVERY message so you can verify number ↔ person before sending.
  pending.forEach((c, i) => {
    console.log(`${String(i + 1).padStart(3)}. ${c.number}  ${c.name} (${c.id})  PIN ${c.pin}`);
  });

  if (DRY) {
    console.log(`\nDRY RUN complete. Verify every number above belongs to the right person.`);
    console.log(`When satisfied, run:  node maya-pin-sender.js`);
    return;
  }

  const { Client, LocalAuth } = require('whatsapp-web.js');
  const qrcode = require('qrcode-terminal');
  const client = new Client({ authStrategy: new LocalAuth(), puppeteer: { args: ['--no-sandbox'] } });
  client.on('qr', qr => { console.log('\nScan this QR with the DEDICATED WhatsApp number:\n'); qrcode.generate(qr, { small: true }); });
  await new Promise(res => { client.on('ready', () => { console.log('\nWhatsApp connected.\n'); res(); }); client.initialize(); });

  let s021Count = 0;
  for (let i = 0; i < pending.length; i++) {
    const c = pending[i];
    try {
      const jid = c.number.replace(/\D/g, '') + '@c.us';
      await client.sendMessage(jid, buildMessage(c.name, c.id, c.pin));
      logSent(c.number, c.id);
      console.log(`  ✓ ${c.number}  ${c.name}`);
    } catch (err) {
      console.log(`  ✗ ${c.number}  ${c.name} — ${err.message}`);
    }
    await sleep(MSG_GAP_MS);
    if ((i + 1) % BATCH_SIZE === 0 && i + 1 < pending.length) {
      console.log(`\n  …batch of ${BATCH_SIZE} done. Cooling down ${COOLDOWN_MS / 60000} min.\n`);
      await sleep(COOLDOWN_MS);
    }
  }
  console.log('\nDone. Purging session.');
  await client.destroy();
}

main().catch(e => { console.error(e); process.exit(1); });
