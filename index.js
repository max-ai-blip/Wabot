const {
  default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { cfg } = require('./store');
const { map } = require('./loader');

const digits = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: pino({ level: 'silent' }), browser: ['MiBot', 'Chrome', '1.0'] });

  // Vinculación por código (sin QR): PAIR_NUMBER=521234567890 node index.js
  if (!state.creds.registered && process.env.PAIR_NUMBER) {
    setTimeout(async () => {
      const code = await sock.requestPairingCode(process.env.PAIR_NUMBER.replace(/\D/g, ''));
      console.log('🔑 Código de vinculación:', code);
    }, 3000);
  }

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr && !process.env.PAIR_NUMBER) qrcode.generate(qr, { small: true });
    if (connection === 'open') console.log('✅ Bot conectado');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) start();
      else console.log('❌ Sesión cerrada. Borra la carpeta "session" y vuelve a vincular.');
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
        const sender = digits(m.key.participant || from);
        const isOwner = m.key.fromMe || cfg.owners.includes(sender);
        if (cfg.banned.includes(sender) && !isOwner) continue;
        if (cfg.mode === 'private' && !isOwner) continue;

        const [cmdRaw, ...args] = body.slice(cfg.prefix.length).trim().split(/\s+/);
        const command = cmdRaw.toLowerCase();
        const cmd = map.get(command);
        if (!cmd) continue;

        const reply = (t) => sock.sendMessage(from, { text: t }, { quoted: m });
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
