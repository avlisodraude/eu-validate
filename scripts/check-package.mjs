import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Exercise the actual tarball as a consumer, including package export resolution.
const directory = mkdtempSync(join(tmpdir(), 'eu-validate-package-'))
try {
  const [packed] = JSON.parse(execFileSync('npm', [
    'pack', '--json', '--ignore-scripts', '--pack-destination', directory,
  ], { encoding: 'utf8' }))
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))
  assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0)
  const included = new Set(packed.files.map(file => file.path))
  for (const file of ['index.js', 'index.cjs', 'index.d.ts', 'index.d.cts',
    'cloud.js', 'cloud.cjs', 'cloud.d.ts', 'cloud.d.cts']) {
    assert.ok(included.has(`dist/${file}`), `Missing packed artifact: ${file}`)
  }
  assert.ok([...included].every(file => !/^(src|test|scripts|node_modules)\//.test(file)))
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ private: true }))
  // npm run can export install-script approvals into its child environment.
  // The temporary consumer does not need approvals: scripts stay disabled.
  const environment = { ...process.env }
  for (const key of Object.keys(environment)) {
    if (/^npm_config_allow_scripts$/i.test(key)) delete environment[key]
  }
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund',
    join(directory, packed.filename)], { cwd: directory, encoding: 'utf8', env: environment })

  const assertions = `
    assert.equal(api.validateVAT('NL123456782B01').valid, true);
    assert.equal(api.validateVAT('NL123456781B01').valid, false);
    assert.equal(api.validateIBAN('NL91ABNA0417164300').valid, true);
    assert.equal(typeof api.assertValid, 'function');
    assert.equal(typeof cloud.createClient, 'function');
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith('/vat/verify'));
      assert.equal(options.headers.authorization, 'Bearer package-test');
      return new Response(JSON.stringify({registered: true}), {status: 200});
    };
    cloud.createClient({apiKey: 'package-test'}).verifyVAT('NL123456782B01')
      .then(result => assert.equal(result.registered, true))
      .catch(error => { console.error(error); process.exitCode = 1; });
  `
  for (const format of ['module', 'commonjs']) {
    const imports = format === 'module'
      ? `import assert from 'node:assert/strict';
         import * as api from '@alosha/eu-validate';
         import * as cloud from '@alosha/eu-validate/cloud';`
      : `const assert = require('node:assert/strict');
         const api = require('@alosha/eu-validate');
         const cloud = require('@alosha/eu-validate/cloud');`
    execFileSync(process.execPath, [`--input-type=${format}`, '-e', imports + assertions], {
      cwd: directory, stdio: 'pipe',
    })
  }
  console.log('Packed ESM/CJS exports, declarations, validators, and Cloud client passed.')
} finally {
  rmSync(directory, { recursive: true, force: true })
}
