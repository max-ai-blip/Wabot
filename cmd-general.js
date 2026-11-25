const fs = require('fs');
const path = require('path');
const { cfg } = require('./store');
const start = Date.now();

const CATS = { general: '📌 GENERAL', descargas: '📥 DESCARGAS', owner: '👑 OWNER (solo creador)' };

module.exports = [
  {
    name: 'menu', aliases: ['help', 'menú', 'comandos'], category: 'general', desc: 'Muestra todos los comandos',
    async run({ sock, from, m, isOwner }) {
      const { list } = require('./loader'); // carga diferida para evitar ciclo
      const p = cfg.prefix, e = cfg.emoji;
      let txt = `${e} *${cfg.botName}* ${e}\nPrefijo: *${p}*\n`;
      const cats = {};
      for (const c of list) (cats[c.category || 'general'] ||= []).push(c);
      for (const [cat, cmds] of Object.entries(cats)) {
        if (cat === 'owner' && !isOwner) continue;
        txt += `\n*${CATS[cat] || cat.toUpperCase()}*\n`;
        for (const c of cmds) txt += `${e} ${p}${c.name}${c.usage ? ' ' + c.usage : ''} — ${c.desc || ''}\n`;
      }
      const banner = cfg.banner && path.join(__dirname, 'media', cfg.banner);
      if (banner && fs.existsSync(banner))
        return sock.sendMessage(from, { image: fs.readFileSync(banner), caption: txt }, { quoted: m });
      return sock.sendMessage(from, { text: txt }, { quoted: m });
    },
  },
  {
    name: 'ping', category: 'general', desc: 'Velocidad del bot',
    async run({ reply, m }) {
      const ms = Date.now() - (Number(m.messageTimestamp) * 1000);
      reply(`🏓 Pong! ${Math.abs(ms)} ms`);
    },
  },
  {
    name: 'runtime', aliases: ['uptime'], category: 'general', desc: 'Tiempo activo',
    async run({ reply }) {
      const s = Math.floor((Date.now() - start) / 1000);
      reply(`⏱️ Activo: ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`);
    },
  },
  {
    name: 'owner', aliases: ['creador'], category: 'general', desc: 'Contacto del creador',
    async run({ reply }) { reply(`👑 Creador: wa.me/${cfg.owners[0]}`); },
  },
];
