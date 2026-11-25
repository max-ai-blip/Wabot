# WhatsApp Bot (todo en una sola carpeta, sin subcarpetas)

Archivos: index.js, store.js, utils.js, loader.js, cmd-general.js, cmd-downloads.js, cmd-owner.js, config.json, package.json, Dockerfile

## Variables de entorno
- OWNER_NUMBER = tu número (código de país, sin +). Ej: 521234567890
- PAIR_NUMBER  = número donde corre el bot (para el código de 8 dígitos en los Logs)

## Comandos
#menu · #playaudio <canción> · #tiktok · #instagram · #facebook · #twitter · #playvideo · #ytmp3
Owner: #setname #setemoji #setprefix #setbanner #setbotpic #setbio #mode #ban #unban #addowner #broadcast #restart

## Agregar más comandos
Crea un archivo que se llame cmd-algo.js (en la misma carpeta) que exporte un array:
module.exports = [{ name: 'dado', category: 'diversión', desc: 'Lanza un dado', async run({ reply }) { reply('🎲 ' + (1 + Math.floor(Math.random()*6))); } }];
Con owner: true solo lo usas tú. Aparece solo en #menu.

## Disco persistente (recomendado en el hosting)
Monta volúmenes en /app/session (sesión de WhatsApp) y /app/media (banner).
