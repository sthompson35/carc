'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_PATH = path.join(__dirname, '..', '.env');

function main() {
    if (!fs.existsSync(ENV_PATH)) {
        console.error('.env not found at ' + ENV_PATH + ' — run `npm run setup` first, or copy .env.example to .env.');
        process.exit(1);
    }
    const original = fs.readFileSync(ENV_PATH, 'utf8');
    const newSecret = crypto.randomBytes(32).toString('hex');

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = ENV_PATH + '.' + stamp + '.bak';
    fs.writeFileSync(backupPath, original);

    const updated = /^SIGNING_SECRET=.*$/m.test(original)
        ? original.replace(/^SIGNING_SECRET=.*$/m, 'SIGNING_SECRET=' + newSecret)
        : original.replace(/\n?$/, '\n') + 'SIGNING_SECRET=' + newSecret + '\n';
    fs.writeFileSync(ENV_PATH, updated);

    console.log('\n✅  SIGNING_SECRET rotated.');
    console.log('    Previous .env backed up to: ' + backupPath);
    console.log('    New secret: ' + newSecret);
    console.log('\n⚠️  Only NEW signatures issued after restart use this secret.');
    console.log('    There is no re-verification endpoint today, so previously issued');
    console.log('    HMAC signatures are not invalidated by rotation — this only affects');
    console.log('    signatures the server issues going forward. Restart the server to apply.\n');
}

main();
