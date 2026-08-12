'use strict';
const fs   = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'public', 'admin.html');
const src  = fs.readFileSync(file, 'utf8');
const END  = '</html>';
const idx  = src.indexOf(END);
if (idx === -1) { console.error('</html> not found'); process.exit(1); }
const trimmed = src.slice(0, idx + END.length);
fs.writeFileSync(file, trimmed, 'utf8');
const count = (trimmed.match(/restore session/g) || []).length;
console.log('admin.html trimmed to ' + trimmed.length + ' chars, "restore session" occurrences: ' + count);
