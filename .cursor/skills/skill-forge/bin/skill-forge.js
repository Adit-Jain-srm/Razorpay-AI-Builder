#!/usr/bin/env node
/**
 * skill-forge CLI
 * Quick access to skill-forge operations from terminal.
 * 
 * Usage:
 *   npx skill-forge discover     - Run discovery engine
 *   npx skill-forge validate     - Validate all skills
 *   npx skill-forge test         - Run test suite
 *   npx skill-forge status       - Show current state
 *   npx skill-forge self-check   - Run self-improvement analysis
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const SKILLS = path.join(ROOT, 'skills');
const MEMORY = path.join(ROOT, 'memory');

const command = process.argv[2] || 'help';

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: ROOT, stdio: 'inherit', ...opts });
  } catch (e) {
    if (opts.allowFail) return '';
    process.exit(e.status || 1);
  }
}

function quiet(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: ROOT });
  } catch (e) {
    return '';
  }
}

switch (command) {
  case 'discover':
    console.log('\n🔍 Running discovery engine...\n');
    run(`node "${path.join(SCRIPTS, 'discover.js')}"`);
    break;

  case 'validate':
    console.log('\n✓ Validating all skills...\n');
    const skillDirs = fs.readdirSync(SKILLS, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);
    let allPass = true;
    for (const skill of skillDirs) {
      const result = quiet(`node "${path.join(SCRIPTS, 'validate-skill.js')}" "${path.join(SKILLS, skill)}"`);
      const passed = result.includes('VALID');
      console.log(`  ${passed ? '✓' : '✗'} ${skill}`);
      if (!passed) allPass = false;
    }
    console.log(allPass ? '\n✓ All skills valid\n' : '\n✗ Some skills have issues\n');
    process.exit(allPass ? 0 : 1);
    break;

  case 'test':
    console.log('\n🧪 Running test suite...\n');
    run(`node "${path.join(ROOT, 'tests', 'run-tests.js')}"`);
    break;

  case 'status':
    console.log('\n📊 skill-forge status\n');
    const skills = fs.readdirSync(SKILLS, { withFileTypes: true }).filter(d => d.isDirectory());
    const rl = JSON.parse(fs.readFileSync(path.join(MEMORY, 'rl-state.json'), 'utf8'));
    const published = JSON.parse(fs.readFileSync(path.join(MEMORY, 'published.json'), 'utf8'));
    const learnings = JSON.parse(fs.readFileSync(path.join(MEMORY, 'learnings.json'), 'utf8'));
    console.log(`  Skills:     ${skills.length}`);
    console.log(`  Learnings:  ${learnings.total_learnings}`);
    console.log(`  Published:  ${published.total_published} repos`);
    console.log(`  RL Cycles:  ${rl.total_cycles}`);
    console.log(`  Epsilon:    ${rl.epsilon}`);
    console.log(`  Stars:      ${rl.reputation_metrics?.total_stars || 0}`);
    console.log('');
    break;

  case 'self-check':
    console.log('\n🔄 Running self-improvement analysis...\n');
    run(`node "${path.join(SCRIPTS, 'self-improve.js')}" --mode full`);
    break;

  case 'route':
    const task = process.argv.slice(3).join(' ');
    if (!task) { console.error('Usage: skill-forge route "your task description"'); process.exit(1); }
    run(`node "${path.join(SCRIPTS, 'route-task.js')}" "${task}"`);
    break;

  case 'help':
  default:
    console.log(`
skill-forge — Autonomous Skill Meta-Agent CLI

Commands:
  discover      Search for new skills across all sources
  validate      Validate all skills against quality bar
  test          Run the full 71-test suite
  status        Show current state (skills, learnings, stars)
  self-check    Run self-improvement analysis
  route <task>  Find best skill for a task

Example:
  npx skill-forge discover
  npx skill-forge route "optimize my React app performance"
  npx skill-forge validate
`);
    break;
}
