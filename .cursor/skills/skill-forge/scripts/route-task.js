#!/usr/bin/env node
/**
 * skill-forge task router
 * Given a task description, searches the knowledge base for relevant skills,
 * ranks by relevance * quality * rl_weight, and outputs an invocation prompt.
 * 
 * Usage: node route-task.js "deploy my app to vercel with monitoring"
 * 
 * Output: JSON with ranked skills and a generated invocation prompt
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const CURSOR_SKILLS_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.cursor', 'skills');
const CURSOR_BUILTIN_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.cursor', 'skills-cursor');
const AGENTS_SKILLS_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.agents', 'skills');

function loadJson(filename) {
  const filepath = path.join(MEMORY_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function getAllInstalledSkills() {
  const skills = [];

  const dirs = [CURSOR_SKILLS_DIR, CURSOR_BUILTIN_DIR, AGENTS_SKILLS_DIR];

  for (const baseDir of dirs) {
    if (!fs.existsSync(baseDir)) continue;
    scanSkillDir(baseDir, skills, baseDir);
  }

  return skills;
}

function scanSkillDir(dir, skills, baseDir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      const skillMdPath = path.join(dir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillMdPath)) {
        try {
          const content = fs.readFileSync(skillMdPath, 'utf8');
          const frontmatter = parseFrontmatter(content);
          skills.push({
            name: frontmatter.name || entry.name,
            description: frontmatter.description || '',
            path: skillMdPath,
            location: baseDir === CURSOR_BUILTIN_DIR ? 'builtin' : baseDir === AGENTS_SKILLS_DIR ? 'agents' : 'personal',
            content_preview: content.slice(0, 500)
          });
        } catch (_) {}
      }

      const subdir = path.join(dir, entry.name);
      scanSkillDir(subdir, skills, baseDir);
    }
  } catch (_) {}
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

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function computeRelevance(taskTokens, skill) {
  const descTokens = tokenize(skill.description + ' ' + skill.name);
  const previewTokens = tokenize(skill.content_preview || '');
  const allSkillTokens = new Set([...descTokens, ...previewTokens]);

  let matches = 0;
  for (const token of taskTokens) {
    if (allSkillTokens.has(token)) matches++;
    for (const st of allSkillTokens) {
      if (st.includes(token) || token.includes(st)) { matches += 0.5; break; }
    }
  }

  return Math.min(1.0, matches / Math.max(taskTokens.length, 1));
}

function rankSkills(task, skills, rlState) {
  const taskTokens = tokenize(task);

  const scored = skills.map(skill => {
    const relevance = computeRelevance(taskTokens, skill);
    const qualityBoost = skill.location === 'builtin' ? 1.1 : skill.location === 'agents' ? 1.05 : 1.0;

    let rlWeight = 1.0;
    if (rlState && rlState.routing_accuracy && rlState.routing_accuracy.accuracy > 0.5) {
      rlWeight = 1.1;
    }

    const finalScore = relevance * qualityBoost * rlWeight;

    return { ...skill, relevance, final_score: finalScore };
  });

  return scored
    .filter(s => s.relevance > 0.1)
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, 10);
}

function generateInvocationPrompt(task, rankedSkills) {
  if (rankedSkills.length === 0) {
    return `No matching skills found for: "${task}"\n\nConsider running \`skill-forge discover\` to find relevant skills, or \`skill-forge create\` to build one.`;
  }

  const top = rankedSkills[0];
  const others = rankedSkills.slice(1, 4);

  let prompt = `## Best skill for: "${task}"\n\n`;
  prompt += `**Primary:** \`${top.name}\` (score: ${top.final_score.toFixed(2)})\n`;
  prompt += `> ${top.description}\n\n`;
  prompt += `**Invoke:** Read and follow \`${top.path}\`\n\n`;

  if (others.length > 0) {
    prompt += `**Also consider:**\n`;
    for (const s of others) {
      prompt += `- \`${s.name}\` (${s.final_score.toFixed(2)}) — ${s.description.slice(0, 80)}\n`;
    }
    prompt += '\n';
  }

  if (rankedSkills.length >= 2) {
    prompt += `**Combination prompt:**\n`;
    prompt += `Use \`${top.name}\` as the primary approach. `;
    if (others[0]) prompt += `Augment with \`${others[0].name}\` for additional coverage. `;
    prompt += `\n`;
  }

  return prompt;
}

function main() {
  const task = process.argv.slice(2).join(' ');

  if (!task) {
    console.error('Usage: node route-task.js "your task description"');
    process.exit(1);
  }

  const rlState = loadJson('rl-state.json');
  const discoveredSkills = loadJson('discovered-skills.json');

  const installedSkills = getAllInstalledSkills();

  let allSkills = [...installedSkills];
  if (discoveredSkills && discoveredSkills.skills) {
    for (const ds of discoveredSkills.skills) {
      allSkills.push({
        name: ds.name || ds.source,
        description: ds.description || '',
        path: ds.url || ds.source,
        location: 'discovered',
        content_preview: ds.description || ''
      });
    }
  }

  const ranked = rankSkills(task, allSkills, rlState);
  const prompt = generateInvocationPrompt(task, ranked);

  const output = {
    task,
    total_skills_searched: allSkills.length,
    matches_found: ranked.length,
    top_skills: ranked.slice(0, 5).map(s => ({
      name: s.name,
      score: s.final_score,
      location: s.location,
      description: s.description.slice(0, 120)
    })),
    invocation_prompt: prompt
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
