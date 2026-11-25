const fs = require('fs');
const { ytdlp, toVoice, rm, isUrl, run, uid, TMP } = require('./utils');

const needUrl = (ctx, ex) => {
  if (!isUrl(ctx.args[0])) { ctx.reply(`❌ Pon un enlace válido.\nEj: ${ctx.prefix}${ctx.command} ${ex}`); return false; }
  return true;
};

async function sendVideo({ sock, from, m, reply }, url, label) {
  await reply(`⏳ Descargando ${label}...`);
  const { title, file } = await ytdlp(url, 'video');
  await sock.sendMessage(from, { video: fs.readFileSync(file), caption: `✅ ${title || label}`, mimetype: 'video/mp4' }, { quoted: m });
  rm(file);
}

const generic = (name, aliases, label, example) => ({
  name, aliases, category: 'descargas', desc: `Video de ${label}`, usage: '<enlace>',
  async run(ctx) { if (needUrl(ctx, example)) await sendVideo(ctx, ctx.args[0], label); },
});

module.exports = [
  {
    name: 'playaudio', aliases: ['play', 'musica'], category: 'descargas', desc: 'Canción como nota de voz', usage: '<nombre>',
    async run({ sock, from, m, text, reply }) {
      if (!text) return reply('❌ Escribe el nombre. Ej: #playaudio maluma');
      await reply('🎧 Buscando y preparando tu audio...');
      const target = isUrl(text) ? text : `ytsearch1:${text}`;
      const { title, file } = await ytdlp(target, 'audio');
      const ogg = await toVoice(file);
      await sock.sendMessage(from, { audio: fs.readFileSync(ogg), mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m });
      await reply(`🎵 ${title}`);
      rm(file, ogg);
    },
  },
  {
    name: 'ytmp3', category: 'descargas', desc: 'Audio de YouTube como mp3', usage: '<enlace|nombre>',
    async run({ sock, from, m, text, reply }) {
      if (!text) return reply('❌ Pon un enlace o nombre.');
      await reply('⏳ Procesando...');
      const { title, file } = await ytdlp(isUrl(text) ? text : `ytsearch1:${text}`, 'audio');
      const mp3 = `${TMP}/${uid()}.mp3`;
      await run('ffmpeg', ['-y', '-i', file, '-vn', '-b:a', '128k', mp3]);
      await sock.sendMessage(from, { audio: fs.readFileSync(mp3), mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: m });
      rm(file, mp3);
    },
  },
  {
    name: 'playvideo', aliases: ['ytmp4', 'ytvideo'], category: 'descargas', desc: 'Video de YouTube', usage: '<enlace|nombre>',
    async run(ctx) {
      if (!ctx.text) return ctx.reply('❌ Pon un enlace o nombre.');
      await sendVideo(ctx, isUrl(ctx.text) ? ctx.text : `ytsearch1:${ctx.text}`, 'YouTube');
    },
  },
  {
    name: 'tiktok', aliases: ['tt', 'tiktokdl'], category: 'descargas', desc: 'TikTok SIN marca de agua', usage: '<enlace>',
    async run(ctx) {
      if (!needUrl(ctx, 'https://vm.tiktok.com/xxxx')) return;
      const { sock, from, m, reply } = ctx;
      await reply('⏳ Descargando TikTok sin marca de agua...');
      try {
        const r = await fetch('https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(ctx.args[0]));
        const j = await r.json();
        const url = j?.data?.hdplay || j?.data?.play;
        if (!url) throw new Error('sin url');
        const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
        await sock.sendMessage(from, { video: buf, caption: `✅ ${j.data.title || 'TikTok'}` }, { quoted: m });
      } catch {
        await sendVideo(ctx, ctx.args[0], 'TikTok'); // respaldo con yt-dlp
      }
    },
  },
  {
    name: 'tiktokaudio', aliases: ['ttaudio'], category: 'descargas', desc: 'Audio de un TikTok', usage: '<enlace>',
    async run(ctx) {
      if (!needUrl(ctx, 'https://vm.tiktok.com/xxxx')) return;
      const { file } = await ytdlp(ctx.args[0], 'audio');
      const ogg = await toVoice(file);
      await ctx.sock.sendMessage(ctx.from, { audio: fs.readFileSync(ogg), mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: ctx.m });
      rm(file, ogg);
    },
  },
  generic('instagram', ['ig', 'igdl'], 'Instagram', 'https://instagram.com/reel/xxxx'),
  generic('facebook', ['fb', 'fbdl'], 'Facebook', 'https://facebook.com/watch/?v=xxxx'),
  generic('twitter', ['x', 'twdl'], 'Twitter/X', 'https://x.com/user/status/xxxx'),
  generic('pinterest', ['pin'], 'Pinterest', 'https://pin.it/xxxx'),
  generic('threads', [], 'Threads', 'https://threads.net/@user/post/xxxx'),
  generic('reddit', [], 'Reddit', 'https://reddit.com/r/xxxx'),
];
