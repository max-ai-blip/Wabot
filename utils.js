const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const TMP = path.join(__dirname, 'tmp');
fs.mkdirSync(TMP, { recursive: true });

const run = (bin, args, opts = {}) =>
  new Promise((resolve, reject) =>
    execFile(bin, args, { maxBuffer: 1024 * 1024 * 50, timeout: 180000, ...opts }, (err, stdout, stderr) =>
      err ? reject(new Error(stderr || err.message)) : resolve(stdout.trim())
    )
  );

const uid = () => Date.now() + '_' + Math.random().toString(36).slice(2, 8);
const rm = (...files) => files.forEach((f) => f && fs.unlink(f, () => {}));
const isUrl = (s) => /^https?:\/\/\S+$/i.test(s || '');

// Descarga con yt-dlp. mode: 'audio' | 'video'
async function ytdlp(target, mode = 'video') {
  const id = uid();
  const out = path.join(TMP, id + '.%(ext)s');
  const base = ['--no-playlist', '--no-simulate', '--max-filesize', '60M',
    '--print', '%(title)s', '--print', 'after_move:filepath', '-o', out];
  const args = mode === 'audio'
    ? ['-f', 'bestaudio', ...base, target]
    : ['-f', 'bv*[height<=720]+ba/b[height<=720]/b', '--merge-output-format', 'mp4', ...base, target];
  const res = await run('yt-dlp', args);
  const lines = res.split('\n').filter(Boolean);
  return { title: lines[0], file: lines[lines.length - 1] };
}

// Convierte cualquier audio a nota de voz (ogg/opus)
async function toVoice(input) {
  const out = path.join(TMP, uid() + '.ogg');
  await run('ffmpeg', ['-y', '-i', input, '-vn', '-c:a', 'libopus', '-b:a', '64k', '-ar', '48000', '-ac', '1', out]);
  return out;
}

module.exports = { run, rm, isUrl, ytdlp, toVoice, uid, TMP };
