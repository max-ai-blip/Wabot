const {
  default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { cfg } = require('./store');
const { map } = require('./loader');

const SESSION_DIR = path.join(__dirname, 'session');
const LINKED = path.join(SESSION_DIR, '.linked');
const PAIR = (process.env.PAIR_NUMBER || '').replace(/\D/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Un error suelto no debe tumbar el bot
process.on('unhandledRejection', (e) => console.error('⚠️ unhandledRejection:', (e && e.message) || e));
process.on('uncaughtException', (e) => console.error('⚠️ uncaughtException:', (e && e.message) || e));

// Quitar el número de ejemplo de config.json
cfg.owners = cfg.owners.filter((o) => /^\d+$/.test(o));

const digits = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const sameNumber = (a, b) =>
  !!a && !!b && (a === b || (a.length >= 8 && b.length >= 8 && a.slice(-10) === b.slice(-10)));

// Borra el CONTENIDO de la carpeta session (sirve aunque sea un enlace a un volumen)
function wipeSession() {
  try {
    for (const f of fs.readdirSync(SESSION_DIR)) fs.rmSync(path.join(SESSION_DIR, f), { recursive: true, force: true });
  } catch {}
}

async function start(checkStale = true) {
  let { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  // Vinculación a medias (nunca llegó a conectarse): empezar limpio
  if (checkStale && state.creds.me && !fs.existsSync(LINKED)) {
    console.log('♻️ Había una vinculación a medias. Limpiando para generar un código nuevo...');
    wipeSession();
    ({ state, saveCreds } = await useMultiFileAuthState(SESSION_DIR));
  }

  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }), browser: ['MiBot', 'Chrome', '1.0'] });
  let pairRequested = false;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      if (PAIR && !state.creds.me) {
        // Pedir el código solo cuando la conexión ya está lista (evento qr)
        if (!pairRequested) {
          pairRequested = true;
          for (let i = 1; i <= 3; i++) {
            try {
              await sleep(2000);
              const code = await sock.requestPairingCode(PAIR);
              console.log('🔑 Código de vinculación:', code);
              console.log('👉 WhatsApp > Dispositivos vinculados > Vincular dispositivo > Vincular con número de teléfono');
              break;
            } catch (e) {
              console.error('⚠️ No se pudo pedir el código (intento ' + i + '):', (e && e.message) || e);
            }
          }
        }
      } else if (!PAIR) {
        qrcode.generate(qr, { small: true });
      }
    }

    if (connection === 'open') {
      console.log('✅ Bot conectado');
      try { fs.mkdirSync(SESSION_DIR, { recursive: true }); fs.writeFileSync(LINKED, '1'); } catch {}
    }

    if (connection === 'close') {
      const code = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output
        ? lastDisconnect.error.output.statusCode : undefined;
      console.log('🔌 Conexión cerrada (código ' + code + ')');
      if (code === DisconnectReason.restartRequired) return start(false); // normal justo después de vincular
      if (code === DisconnectReason.loggedOut) {
        console.log('⚠️ Sesión cerrada. Se borra y se pedirá un código nuevo.');
        wipeSession();
      }
      setTimeout(() => start(true), 5000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      try {
        if (!m.message || m.key.remoteJid === 'status@broadcast') continue;
        const msg = m.message.ephemeralMessage?.message || m.message;
        const body = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || '';
        if (!body.startsWith(cfg.prefix)) continue;

        const from = m.key.remoteJid;
        const ids = [m.key.participant, m.key.participantAlt, m.key.remoteJid, m.key.remoteJidAlt, m.key.senderPn, m.key.participantPn]
          .filter((j) => j && !j.endsWith('@g.us') && j !== 'status@broadcast');
        const senders = ids.map(digits).filter(Boolean);
        const sender = senders[0] || '';
        const isOwner = !!m.key.fromMe || senders.some((s) => cfg.owners.some((o) => sameNumber(s, o)));
        if (!isOwner && senders.some((s) => cfg.banned.some((b) => sameNumber(s, b)))) continue;
        if (cfg.mode === 'private' && !isOwner) continue;

        const [cmdRaw, ...args] = body.slice(cfg.prefix.length).trim().split(/\s+/);
        const command = cmdRaw.toLowerCase();
        const reply = (t) => sock.sendMessage(from, { text: t }, { quoted: m });

        // #id: muestra cómo te ve WhatsApp (por si el bot no te reconoce como owner)
        if (command === 'id') {
          await reply('🆔 Tus IDs:\n' + (ids.join('\n') || '(ninguno)') +
            '\n\nSi el bot no te reconoce como owner, pon en OWNER_NUMBER el número largo de aquí (lo que va antes de @).');
          continue;
        }

        const cmd = map.get(command);
        if (!cmd) continue;
        if (cmd.owner && !isOwner) { await reply('⛔ Este comando es solo para el creador del bot.'); continue; }

        await cmd.run({ sock, m, from, sender, isOwner, command, args, text: args.join(' '), prefix: cfg.prefix, reply });
      } catch (e) {
        console.error(e);
        try { await sock.sendMessage(m.key.remoteJid, { text: '⚠️ Error: ' + String(e.message).slice(0, 200) }, { quoted: m }); } catch {}
      }
    }
  });
}

start();
