import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

test('AI-POT mount preserves read-only access and refuses missing source', () => {
  const config = JSON.parse(execFileSync('docker', ['compose', '-f', 'compose.yaml', 'config', '--format', 'json'], { encoding: 'utf8' }));
  const mount = config.services.api.volumes.find(v => v.target === '/aipot-content');
  assert.match(mount.source, /\/study\/aipot\/실전모의고사$/);
  assert.equal(mount.read_only, true);
  assert.equal(mount.bind.create_host_path, false);
});

test('active content tools use the migrated study root', () => {
  for (const name of readdirSync('tools').filter(n => n.endsWith('.mjs') && n !== 'test-home-migration.mjs')) {
    assert.doesNotMatch(readFileSync(`tools/${name}`, 'utf8'), /cgma_git\/study|personal_study/);
  }
});
