const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'config.json');
const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));

// Owner desde variable de entorno (útil en hosting): OWNER_NUMBER=521234567890
const envOwner = (process.env.OWNER_NUMBER || '').replace(/\D/g, '');
if (envOwner && !cfg.owners.includes(envOwner)) cfg.owners.push(envOwner);

module.exports = {
  cfg,
  save: () => fs.writeFileSync(file, JSON.stringify(cfg, null, 2)),
};
