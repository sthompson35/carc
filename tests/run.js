'use strict';
// Framework-free unit test runner for the pure(ish)-logic modules — same assert()-counter
// style as runtime/scripts/e2e.js. Loads target module files into a shared vm context (with
// minimal window/document/localStorage stubs, enough for these modules to parse and run
// without a real DOM) then hands control to each *.test.js file.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function makeContext() {
    const store = {};
    const localStorage = {
        getItem: function (k) { return k in store ? store[k] : null; },
        setItem: function (k, v) { store[k] = String(v); },
        removeItem: function (k) { delete store[k]; }
    };
    const sandbox = {
        console: console,
        localStorage: localStorage,
        document: {
            getElementById: function () { return null; },
            querySelector: function () { return null; },
            querySelectorAll: function () { return []; },
            createElement: function () { return { style: {}, classList: { add: function () {}, remove: function () {}, toggle: function () {} } }; },
            addEventListener: function () {},
            documentElement: { getAttribute: function () { return null; }, setAttribute: function () {} }
        },
        navigator: {},
        location: { hash: '' }
    };
    sandbox.window = sandbox;
    return vm.createContext(sandbox);
}

function loadModules(ctx, files) {
    for (const f of files) {
        const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
        new vm.Script(code, { filename: f }).runInContext(ctx);
    }
}

function main() {
    const testFiles = fs.readdirSync(__dirname).filter(function (f) { return f.endsWith('.test.js'); }).sort();
    let totalPass = 0, totalFail = 0;

    for (const tf of testFiles) {
        const suite = require(path.join(__dirname, tf));
        const ctx = makeContext();
        loadModules(ctx, suite.modules);
        let pass = 0, fail = 0;
        function assert(cond, label) {
            if (cond) { pass++; } else { fail++; console.error('  FAIL  ' + label); }
        }
        console.log('\n[' + tf + ']');
        suite.run(ctx, assert);
        console.log('  ' + pass + ' passed, ' + fail + ' failed');
        totalPass += pass; totalFail += fail;
    }

    console.log('\n══════════════════════════════════════════');
    console.log('  Frontend unit tests: ' + totalPass + ' passed, ' + totalFail + ' failed');
    console.log('══════════════════════════════════════════\n');
    process.exit(totalFail > 0 ? 1 : 0);
}

main();
