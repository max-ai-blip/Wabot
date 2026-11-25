const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { cfg, save } = require('./store');

const num = (s) => (s || '').replace(/\D/g, '');

async function getImage(ctx) {
  const msg = ctx.m.message.ephemeralMessage?.message || ctx.m.message;
  if (msg.imageMessage) return downloadMediaMessage(ctx.m, 'buffer', {});
  const ci = msg.extendedTextMessage?.contextInfo;
  if (ci?.quotedMessage?.imageMessage) {
    const fake = { key: { remoteJid: ctx.from, id: ci.stanzaId, participant: ci.participant }, message: ci.quotedMessage };
    return downloadMediaMessage(fake, 'buffer', {});
  }
  return null;
}

const O = (name, desc, usage, run, aliases = []) => ({ name, aliases, category: 'owner', owner: true, desc, usage, run });

module.exports = [
  O('setname', 'Cambiar nombre del bot', '<nombre>', async ({ text, reply }) => {
    if (!text) return reply('❌ Escribe el nuevo nombre.');
    cfg.botName = text; save(); reply(`✅ Nombre cambiado a *${text}*`);
  }, ['setnombre']),

  O('setemoji', 'Cambiar emoji del menú', '<emoji>', async ({ text, reply }) => {
    if (!text) return reply('❌ Pon un emoji.');
    cfg.emoji = text.trim(); save(); reply(`✅ Emoji: ${cfg.emoji}`);
  }),

  O('setprefix', 'Cambiar prefijo (ej: # ! .)', '<prefijo>', async ({ text, reply }) => {
    if (!text) return reply('❌ Pon un prefijo.');
    cfg.prefix = text.trim(); save(); reply(`✅ Prefijo: *${cfg.prefix}*`);
  }, ['setprefijo']),

  O('setbanner', 'Imagen del menú (envía o responde a una foto)', '', async (ctx) => {
    const buf = await getImage(ctx);
    if (!buf) return ctx.reply('❌ Envía una foto con el comando o responde a una.');
    fs.mkdirSync(path.join(__dirname, 'media'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'media', 'banner.jpg'), buf);
    cfg.banner = 'banner.jpg'; save(); ctx.reply('✅ Banner del menú actualizado.');
  }),

  O('setbotpic', 'Foto de perfil del bot', '', async (ctx) => {
    const buf = await getImage(ctx);
    if (!buf) return ctx.reply('❌ Envía una foto con el comando o responde a una.');
    await ctx.sock.updateProfilePicture(ctx.sock.user.id.split(':')[0] + '@s.whatsapp.net', buf);
    ctx.reply('✅ Foto de perfil actualizada.');
  }),

  O('setbio', 'Cambiar el estado/bio del bot', '<texto>', async ({ sock, text, reply }) => {
    if (!text) return reply('❌ Escribe el texto.');
    await sock.updateProfileStatus(text); reply('✅ Bio actualizada.');
  }),

  O('mode', 'Modo público o privado', '<public|private>', async ({ args, reply }) => {
    if (!['public', 'private'].includes(args[0])) return reply('❌ Usa: public o private');
    cfg.mode = args[0]; save(); reply(`✅ Modo: ${cfg.mode}`);
  }, ['modo']),

  O('addowner', 'Agregar otro owner', '<número>', async ({ args, reply }) => {
    const n = num(args[0]); if (!n) return reply('❌ Pon el número con código de país.');
    if (!cfg.owners.includes(n)) cfg.owners.push(n); save(); reply('✅ Owner agregado.');
  }),

  O('delowner', 'Quitar owner', '<número>', async ({ args, reply }) => {
    cfg.owners = cfg.owners.filter((o) => o !== num(args[0])); save(); reply('✅ Owner eliminado.');
  }),

  O('ban', 'Bloquear usuario del bot', '<número>', async ({ args, reply }) => {
    const n = num(args[0]); if (!n) return reply('❌ Pon el número.');
    if (!cfg.banned.includes(n)) cfg.banned.push(n); save(); reply('🚫 Usuario baneado.');
  }),

  O('unban', 'Desbloquear usuario', '<número>', async ({ args, reply }) => {
    cfg.banned = cfg.banned.filter((b) => b !== num(args[0])); save(); reply('✅ Usuario desbaneado.');
  }),

  O('broadcast', 'Mensaje a todos los grupos', '<texto>', async ({ sock, text, reply }) => {
    if (!text) return reply('❌ Escribe el mensaje.');
    const groups = Object.keys(await sock.groupFetchAllParticipating());
    for (const g of groups) { await sock.sendMessage(g, { text: `📢 *${cfg.botName}*\n\n${text}` }); await new Promise((r) => setTimeout(r, 1500)); }
    reply(`✅ Enviado a ${groups.length} grupos.`);
  }, ['bc']),

  O('restart', 'Reiniciar bot', '', async ({ reply }) => { await reply('♻️ Reiniciando...'); process.exit(0); }),
];
