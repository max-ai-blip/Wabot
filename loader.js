const fs = require('fs');
const path = require('path');
const dir = __dirname;
const map = new Map();
const list = [];
for (const f of fs.readdirSync(dir).filter((f) => f.startsWith('cmd-') && f.endsWith('.js'))) {
  for (const c of require(path.join(dir, f))) {
    list.push(c);
    map.set(c.name, c);
    (c.aliases || []).forEach((a) => map.set(a, c));
  }
}
module.exports = { map, list };
