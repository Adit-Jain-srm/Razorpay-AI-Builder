#!/usr/bin/env node
/**
 * skill-forge analyzer
 * Reads a SKILL.md file (local path or GitHub URL), extracts metadata,
 * scores novelty against existing knowledge, and outputs structured analysis.
 * 
 * Usage: node analyze.js <path-or-url>
 *        node analyze.js --batch <json-file-with-repos>
 * 
 * Output: JSON with extracted patterns, philosophy, novelty score, quality signals
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

function fetchSkillFromGithub(fullName) {
  try {
    const cmd = `gh api repos/${fullName}/contents/SKILL.md -H "Accept: application/vnd.github.raw" 2>&1`;
    return execSync(cmd, { encoding: 'utf8', timeout: 15000 });
  } catch (e) {
    try {
      const cmd2 = `gh api repos/${fullName}/contents --jq ".[].name" 2>&1`;
      const files = execSync(cmd2, { encoding: 'utf8', timeout: 15000 });
      const dirs = files.split('\n').filter(f => !f.includes('.'));
      for (const dir of dirs.slice(0, 5)) {
        try {
          const cmd3 = `gh api repos/${fullName}/contents/${dir}/SKILL.md -H "Accept: application/vnd.github.raw" 2>&1`;
          return execSync(cmd3, { encoding: 'utf8', timeout: 15000 });
        } catch (_) { continue; }
      }
    } catch (_) {}
    return null;
  }
}

function fetchReadmeFromGithub(fullName) {
  try {
    const cmd = `gh api repos/${fullName}/readme -H "Accept: application/vnd.github.raw" 2>&1`;
    return execSync(cmd, { encoding: 'utf8', timeout: 15000 });
  } catch (e) {
    return null;
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result = {};
  for (const line of yaml.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      result[key] = value;
    }
  }
  return result;
}

function extractPatterns(content) {
  const patterns = [];
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  if (codeBlocks.length > 0) patterns.push('has_code_examples');

  if (content.includes('## Workflow') || content.includes('## Process')) patterns.push('workflow_pattern');
  if (content.includes('## Template') || content.includes('template')) patterns.push('template_pattern');
  if (content.includes('subagent') || content.includes('parallel')) patterns.push('parallel_execution');
  if (content.includes('## Quick') || content.includes('quickstart')) patterns.push('quick_start');
  if (content.match(/\|.*\|.*\|/)) patterns.push('has_tables');
  if (content.includes('```dot') || content.includes('```mermaid')) patterns.push('has_diagrams');
  if (content.includes('- [ ]') || content.includes('- [x]')) patterns.push('has_checklists');
  if (content.includes('scripts/') || content.includes('## Scripts')) patterns.push('has_utility_scripts');
  if (content.includes('reference.md') || content.includes('[reference')) patterns.push('progressive_disclosure');
  if (content.includes('MCP') || content.includes('CallMcpTool')) patterns.push('uses_mcp');
  if (content.includes('RL') || content.includes('reinforcement') || content.includes('EMA')) patterns.push('uses_rl');
  if (content.includes('self-improv') || content.includes('evolve')) patterns.push('self_improving');

  return patterns;
}

function extractPhilosophy(content) {
  const philosophies = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.startsWith('**') && line.endsWith('**') && line.length < 200) {
      philosophies.push(line.replace(/\*\*/g, '').trim());
    }
    if (line.startsWith('> ') && line.length > 20) {
      philosophies.push(line.replace(/^>\s*/, '').trim());
    }
  }

  if (content.includes('NEVER') || content.includes('ALWAYS')) {
    const rules = lines.filter(l => l.includes('NEVER') || l.includes('ALWAYS'));
    philosophies.push(...rules.slice(0, 5).map(r => r.replace(/^[-*]\s*/, '').trim()));
  }

  return philosophies.slice(0, 10);
}

function scoreNovelty(patterns, philosophies, existingLearnings) {
  if (!existingLearnings || !existingLearnings.patterns) return 0.7;

  const knownPatterns = new Set(existingLearnings.patterns.map(p => p.pattern || p));
  const knownPhilosophies = new Set(existingLearnings.philosophies.map(p => p.text || p));

  let novelPatterns = patterns.filter(p => !knownPatterns.has(p)).length;
  let novelPhilosophies = philosophies.filter(p => !knownPhilosophies.has(p)).length;

  const totalNovel = novelPatterns + novelPhilosophies;
  const totalFound = patterns.length + philosophies.length;

  if (totalFound === 0) return 0.1;
  return Math.min(1.0, totalNovel / Math.max(totalFound, 1));
}

function scoreQuality(content, frontmatter, stars) {
  let score = 0;
  if (frontmatter.name) score += 0.1;
  if (frontmatter.description && frontmatter.description.length > 20) score += 0.15;
  if (content.split('\n').length <= 500) score += 0.1;
  if (content.includes('```')) score += 0.1;
  if (content.includes('## ')) score += 0.1;
  if (stars > 100) score += 0.2;
  else if (stars > 10) score += 0.1;
  if (content.includes('Use when') || content.includes('WHEN')) score += 0.1;
  if (content.length > 500 && content.length < 20000) score += 0.15;
  return Math.min(1.0, score);
}

function identifyWhatssMissing(content, frontmatter) {
  const missing = [];
  if (!content.includes('```')) missing.push('no_code_examples');
  if (!content.includes('## Example') && !content.includes('example')) missing.push('no_examples_section');
  if (!content.includes('error') && !content.includes('Error') && !content.includes('fail')) missing.push('no_error_handling_guidance');
  if (!content.includes('scripts/')) missing.push('no_utility_scripts');
  if (content.split('\n').length > 500) missing.push('too_long_needs_splitting');
  if (!frontmatter.description || frontmatter.description.length < 30) missing.push('weak_description');
  if (!content.includes('## Quick') && !content.includes('quickstart')) missing.push('no_quickstart');
  if (!content.includes('Common Mistake') && !content.includes('Anti-Pattern')) missing.push('no_pitfalls_section');
  return missing;
}

function analyzeSkill(content, source, stars = 0) {
  const frontmatter = parseFrontmatter(content);
  const patterns = extractPatterns(content);
  const philosophy = extractPhilosophy(content);
  const learnings = loadJson('learnings.json');
  const noveltyScore = scoreNovelty(patterns, philosophy, learnings);
  const qualityScore = scoreQuality(content, frontmatter, stars);
  const whatsMissing = identifyWhatssMissing(content, frontmatter);

  return {
    source,
    name: frontmatter.name || path.basename(source),
    description: frontmatter.description || '',
    line_count: content.split('\n').length,
    patterns,
    philosophy,
    novelty_score: noveltyScore,
    quality_score: qualityScore,
    what_its_missing: whatsMissing,
    quality_signals: {
      stars,
      has_frontmatter: !!frontmatter.name,
      under_500_lines: content.split('\n').length <= 500,
      has_code_examples: content.includes('```'),
      has_scripts: content.includes('scripts/'),
      proper_description: (frontmatter.description || '').length > 30
    },
    analyzed_at: new Date().toISOString()
  };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node analyze.js <github-owner/repo> [--stars <n>]');
    console.error('       node analyze.js --local <path-to-SKILL.md>');
    process.exit(1);
  }

  const starsIdx = args.indexOf('--stars');
  const stars = starsIdx >= 0 ? parseInt(args[starsIdx + 1]) || 0 : 0;

  let content, source;

  if (args[0] === '--local') {
    const filepath = args[1];
    if (!fs.existsSync(filepath)) {
      console.error(`File not found: ${filepath}`);
      process.exit(1);
    }
    content = fs.readFileSync(filepath, 'utf8');
    source = filepath;
  } else {
    source = args[0];
    content = fetchSkillFromGithub(source);
    if (!content) {
      console.error(`Could not fetch SKILL.md from ${source}`);
      const readme = fetchReadmeFromGithub(source);
      if (readme) {
        content = readme;
        console.error('[analyze] Falling back to README.md');
      } else {
        process.exit(1);
      }
    }
  }

  const analysis = analyzeSkill(content, source, stars);
  console.log(JSON.stringify(analysis, null, 2));
}

main();
