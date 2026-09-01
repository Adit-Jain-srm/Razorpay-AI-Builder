#!/usr/bin/env node
/**
 * skill-forge discovery engine
 * Searches across GitHub, skills.sh, Exa MCP, Bright Data, and CLI tools.
 * 
 * This script is invoked by the agent during Phase 1.
 * It outputs JSON to stdout with discovered skills.
 * 
 * Usage: node discover.js [--strategy <a|b|c|d|e|all>] [--limit <n>]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');

function loadJson(filename) {
  const filepath = path.join(MEMORY_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function saveJson(filename, data) {
  const filepath = path.join(MEMORY_DIR, filename);
  data.last_updated = new Date().toISOString();
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function ghSearch(query, extraArgs = '') {
  try {
    const cmd = `gh search repos ${query} ${extraArgs} --json fullName,stargazersCount,description,updatedAt --limit 50`;
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    return JSON.parse(result);
  } catch (e) {
    console.error(`[discover] gh search failed: ${e.message}`);
    return [];
  }
}

function ghSearchByTopic(topic) {
  try {
    const cmd = `gh search repos --topic=${topic} --sort=stars --json fullName,stargazersCount,description,updatedAt --limit 50`;
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    return JSON.parse(result);
  } catch (e) {
    console.error(`[discover] gh topic search failed for ${topic}: ${e.message}`);
    return [];
  }
}

function npxSkillsFind(keyword) {
  try {
    const cmd = `npx skills find "${keyword}" 2>&1`;
    const result = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    return result;
  } catch (e) {
    return '';
  }
}

// Strategy A: GitHub Vacuum — broad search across repos
function strategyGithubVacuum() {
  console.error('[discover] Strategy A: GitHub Vacuum');
  const results = [];

  const searches = [
    ['"SKILL.md" cursor', '--sort=updated'],
    ['"SKILL.md" agent', '--sort=updated'],
    ['cursor skill ai', '--sort=stars'],
  ];

  for (const [query, args] of searches) {
    results.push(...ghSearch(query, args));
  }

  const topics = ['cursor-skill', 'agent-skills', 'mcp-server', 'cursor-rules', 'ai-agent'];
  for (const topic of topics) {
    results.push(...ghSearchByTopic(topic));
  }

  return dedup(results);
}

// Strategy B: Star Leaders — find most-starred skill repos for reputation learning
function strategyStarLeaders() {
  console.error('[discover] Strategy B: Star Leaders (reputation fuel)');
  const results = [];

  results.push(...ghSearch('"SKILL.md"', '--sort=stars'));
  results.push(...ghSearch('cursor skills', '--sort=stars'));
  results.push(...ghSearch('agent skills markdown', '--sort=stars'));

  return dedup(results).sort((a, b) => (b.stargazersCount || 0) - (a.stargazersCount || 0)).slice(0, 30);
}

// Strategy E: CLI Discovery
function strategyCli() {
  console.error('[discover] Strategy E: CLI Discovery');
  const keywords = ['ai', 'mcp', 'automation', 'deploy', 'testing', 'database', 'security'];
  const outputs = [];

  for (const kw of keywords) {
    const result = npxSkillsFind(kw);
    if (result) outputs.push({ keyword: kw, output: result });
  }

  return outputs;
}

function dedup(repos) {
  const seen = new Set();
  return repos.filter(r => {
    if (!r.fullName) return false;
    if (seen.has(r.fullName)) return false;
    seen.add(r.fullName);
    return true;
  });
}

function filterAlreadyKnown(repos, discovered) {
  const knownNames = new Set((discovered.skills || []).map(s => s.source));
  return repos.filter(r => !knownNames.has(r.fullName));
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const strategyArg = args.includes('--strategy') ? args[args.indexOf('--strategy') + 1] : 'all';

  const discovered = loadJson('discovered-skills.json') || { skills: [] };
  const rlState = loadJson('rl-state.json');

  let results = { github: [], star_leaders: [], cli: [], timestamp: new Date().toISOString() };

  if (strategyArg === 'all' || strategyArg === 'a') {
    results.github = filterAlreadyKnown(strategyGithubVacuum(), discovered);
  }

  if (strategyArg === 'all' || strategyArg === 'b') {
    results.star_leaders = strategyStarLeaders();
  }

  if (strategyArg === 'all' || strategyArg === 'e') {
    results.cli = strategyCli();
  }

  const totalNew = results.github.length + results.star_leaders.length;
  results.summary = {
    new_repos_found: results.github.length,
    star_leaders_found: results.star_leaders.length,
    cli_results: results.cli.length,
    total_novel: totalNew
  };

  console.log(JSON.stringify(results, null, 2));
}

main();
