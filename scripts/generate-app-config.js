const fs = require('fs');
const path = require('path');

const apiBaseUrl = String(process.env.PUBLIC_API_BASE_URL || 'http://localhost:3000')
  .trim()
  .replace(/\/+$/, '');

const outputPath = path.join(__dirname, '..', 'docs', 'app-config.json');
const payload = {
  apiBaseUrl,
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outputPath} with apiBaseUrl=${apiBaseUrl}`);
