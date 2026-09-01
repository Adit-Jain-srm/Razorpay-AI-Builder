#!/usr/bin/env node
/**
 * Test suite for skill-forge
 * Validates all skills, scripts, and memory integrity.
 * 
 * Usage: node tests/run-tests.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const MEMORY_DIR = path.join(ROOT, 'memory');

let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \x1b[31m✗\x1b[0m ${name}: ${e.message}`);
    failed++;
  }
}

function skip(name) {
  console.log(`  \x1b[33m○\x1b[0m ${name} (skipped)`);
  skipped++;
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// === STRUCTURE TESTS ===
console.log('\n\x1b[1mStructure Tests\x1b[0m');

test('Root SKILL.md exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'SKILL.md')));
});

test('Root SKILL.md under 500 lines', () => {
  const lines = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8').split('\n').length;
  assert(lines <= 500, `Got ${lines} lines`);
});

test('README.md exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'README.md')));
});

test('CONTEXT.md exists (shared language)', () => {
  assert(fs.existsSync(path.join(ROOT, 'CONTEXT.md')));
});

test('AGENTS.md exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'AGENTS.md')));
});

test('CLAUDE.md exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'CLAUDE.md')));
});

test('CONTRIBUTING.md exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'CONTRIBUTING.md')));
});

test('.cursor-plugin/plugin.json exists', () => {
  assert(fs.existsSync(path.join(ROOT, '.cursor-plugin', 'plugin.json')));
});

test('.claude-plugin/plugin.json exists', () => {
  assert(fs.existsSync(path.join(ROOT, '.claude-plugin', 'plugin.json')));
});

test('docs/ directory exists with guides', () => {
  assert(fs.existsSync(path.join(ROOT, 'docs', 'getting-started.md')));
  assert(fs.existsSync(path.join(ROOT, 'docs', 'skill-anatomy.md')));
});

// === SKILL VALIDATION TESTS ===
console.log('\n\x1b[1mSkill Validation Tests\x1b[0m');

const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

test(`Skills directory contains skills (found ${skillDirs.length})`, () => {
  assert(skillDirs.length >= 5, `Only ${skillDirs.length} skills found`);
});

for (const skill of skillDirs) {
  test(`skills/${skill}/SKILL.md exists`, () => {
    assert(fs.existsSync(path.join(SKILLS_DIR, skill, 'SKILL.md')));
  });

  test(`skills/${skill}/SKILL.md has valid frontmatter`, () => {
    const content = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8');
    assert(content.startsWith('---'), 'Missing frontmatter start');
    assert(content.includes('\n---', 4), 'Missing frontmatter end');
    assert(/^name:/m.test(content), 'Missing name field');
    assert(/description:/m.test(content), 'Missing description field');
  });

  test(`skills/${skill}/SKILL.md under 500 lines`, () => {
    const lines = fs.readFileSync(path.join(SKILLS_DIR, skill, 'SKILL.md'), 'utf8').split('\n').length;
    assert(lines <= 500, `${lines} lines exceeds limit`);
  });
}

// === SCRIPT SYNTAX TESTS ===
console.log('\n\x1b[1mScript Syntax Tests\x1b[0m');

const scripts = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js'));

for (const script of scripts) {
  test(`scripts/${script} has valid syntax`, () => {
    execSync(`node --check "${path.join(SCRIPTS_DIR, script)}"`, { encoding: 'utf8' });
  });
}

// === MEMORY INTEGRITY TESTS ===
console.log('\n\x1b[1mMemory Integrity Tests\x1b[0m');

const expectedMemoryFiles = [
  'rl-state.json', 'discovered-skills.json', 'learnings.json',
  'gaps.json', 'published.json', 'reputation-playbook.json'
];

for (const file of expectedMemoryFiles) {
  test(`memory/${file} exists and is valid JSON`, () => {
    const filepath = path.join(MEMORY_DIR, file);
    assert(fs.existsSync(filepath), 'File missing');
    const content = fs.readFileSync(filepath, 'utf8');
    JSON.parse(content); // throws if invalid
  });
}

test('memory/evolution-log.jsonl exists and has entries', () => {
  const filepath = path.join(MEMORY_DIR, 'evolution-log.jsonl');
  assert(fs.existsSync(filepath));
  const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
  assert(lines.length >= 1, 'No log entries');
  JSON.parse(lines[0]); // first line must be valid JSON
});

// === PLUGIN MANIFEST TESTS ===
console.log('\n\x1b[1mPlugin Manifest Tests\x1b[0m');

test('.cursor-plugin/plugin.json has required fields', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.cursor-plugin', 'plugin.json'), 'utf8'));
  assert(manifest.name, 'Missing name');
  assert(manifest.description, 'Missing description');
  assert(manifest.version, 'Missing version');
  assert(manifest.skills, 'Missing skills path');
});

test('.claude-plugin/plugin.json has required fields', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert(manifest.name, 'Missing name');
  assert(manifest.description, 'Missing description');
  assert(manifest.version, 'Missing version');
});

// === QUALITY TESTS (the REAL bar) ===
console.log('\n\x1b[1mQuality Tests\x1b[0m');

test('README frames skills as PROBLEMS not features', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert(readme.includes('Problem'), 'README should frame around problems');
  assert(readme.includes('Fix'), 'README should show fixes');
});

test('README has multi-platform install instructions', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert(readme.includes('Claude Code'), 'Missing Claude Code install');
  assert(readme.includes('Cursor') || readme.includes('npx skills'), 'Missing Cursor install');
});

test('README has philosophy/authority quotes', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert(readme.includes('Pragmatic Programmer') || readme.includes('Kent Beck') || readme.includes('Ousterhout'),
    'README should reference engineering authorities');
});

test('CONTEXT.md defines project vocabulary', () => {
  const ctx = fs.readFileSync(path.join(ROOT, 'CONTEXT.md'), 'utf8');
  assert(ctx.includes('## Language'), 'CONTEXT.md needs Language section');
  assert(ctx.includes('_Avoid_'), 'CONTEXT.md should specify what to avoid');
});

// === SUMMARY ===
console.log(`\n\x1b[1m${'─'.repeat(50)}\x1b[0m`);
console.log(`\x1b[1mResults: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m, \x1b[33m${skipped} skipped\x1b[0m`);
console.log(`\x1b[1m${'─'.repeat(50)}\x1b[0m\n`);

process.exit(failed > 0 ? 1 : 0);
