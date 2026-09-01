#!/usr/bin/env node
/**
 * skill-forge installer
 * Installs a skill from a GitHub repo or URL into the local Cursor setup.
 * 
 * Methods (in priority order):
 * 1. npx skills add owner/repo (standard)
 * 2. Clone + copy to ~/.cursor/skills/
 * 3. For MCP servers: update .cursor/mcp.json
 * 
 * Usage: node install.js <owner/repo>
 *        node install.js --mcp <owner/repo> --command "npx -y @scope/server"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const SKILLS_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.cursor', 'skills');

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

function tryNpxSkillsAdd(repo) {
  try {
    console.error(`[install] Trying: npx skills add ${repo} -a cursor -y`);
    const result = execSync(`npx skills add ${repo} -a cursor -y`, {
      encoding: 'utf8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.error(`[install] npx skills add succeeded`);
    return { success: true, method: 'npx_skills_add', output: result };
  } catch (e) {
    console.error(`[install] npx skills add failed: ${e.message}`);
    return { success: false };
  }
}

function tryManualClone(repo) {
  const repoName = repo.split('/').pop();
  const targetDir = path.join(SKILLS_DIR, repoName);

  if (fs.existsSync(targetDir)) {
    console.error(`[install] Already exists: ${targetDir}`);
    return { success: true, method: 'already_installed', path: targetDir };
  }

  try {
    console.error(`[install] Trying manual clone of ${repo}`);
    const tempDir = path.join(process.env.TEMP || '/tmp', `skill-forge-${Date.now()}`);
    execSync(`git clone --depth 1 https://github.com/${repo}.git "${tempDir}"`, {
      encoding: 'utf8',
      timeout: 30000
    });

    const skillMd = path.join(tempDir, 'SKILL.md');
    if (fs.existsSync(skillMd)) {
      fs.mkdirSync(targetDir, { recursive: true });
      copyDir(tempDir, targetDir);
      console.error(`[install] Installed to ${targetDir}`);
      return { success: true, method: 'manual_clone', path: targetDir };
    }

    const entries = fs.readdirSync(tempDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && fs.existsSync(path.join(tempDir, entry.name, 'SKILL.md'))) {
        const subTarget = path.join(SKILLS_DIR, entry.name);
        fs.mkdirSync(subTarget, { recursive: true });
        copyDir(path.join(tempDir, entry.name), subTarget);
        console.error(`[install] Installed sub-skill ${entry.name} to ${subTarget}`);
        return { success: true, method: 'manual_clone_subdir', path: subTarget };
      }
    }

    console.error(`[install] No SKILL.md found in ${repo}`);
    return { success: false };
  } catch (e) {
    console.error(`[install] Manual clone failed: ${e.message}`);
    return { success: false };
  }
}

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function installMcpServer(name, command, env = {}) {
  const mcpConfigPath = path.join(process.env.HOME || process.env.USERPROFILE, '.cursor', 'mcp.json');
  let config = { mcpServers: {} };

  if (fs.existsSync(mcpConfigPath)) {
    config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  }

  if (config.mcpServers[name]) {
    console.error(`[install] MCP server "${name}" already configured`);
    return { success: true, method: 'mcp_already_configured' };
  }

  const args = command.split(' ').slice(1);
  config.mcpServers[name] = {
    command: command.split(' ')[0],
    args,
    env
  };

  fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2));
  console.error(`[install] MCP server "${name}" added to mcp.json`);
  return { success: true, method: 'mcp_configured' };
}

function validateInstallation(skillPath) {
  if (!skillPath || !fs.existsSync(skillPath)) return { valid: false, reason: 'path_not_found' };

  const skillMd = path.join(skillPath, 'SKILL.md');
  if (!fs.existsSync(skillMd)) return { valid: false, reason: 'no_skill_md' };

  const content = fs.readFileSync(skillMd, 'utf8');
  const hasFrontmatter = content.startsWith('---');
  const hasName = /^name:/m.test(content);
  const hasDescription = /^description:/m.test(content);

  return {
    valid: hasFrontmatter && hasName,
    has_frontmatter: hasFrontmatter,
    has_name: hasName,
    has_description: hasDescription,
    line_count: content.split('\n').length
  };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node install.js <owner/repo>');
    console.error('       node install.js --mcp <name> --command "npx -y @scope/server"');
    process.exit(1);
  }

  if (args[0] === '--mcp') {
    const name = args[1];
    const cmdIdx = args.indexOf('--command');
    const command = cmdIdx >= 0 ? args.slice(cmdIdx + 1).join(' ') : '';
    const result = installMcpServer(name, command);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const repo = args[0];

  let result = tryNpxSkillsAdd(repo);
  if (!result.success) {
    result = tryManualClone(repo);
  }

  if (result.success && result.path) {
    const validation = validateInstallation(result.path);
    result.validation = validation;
  }

  if (result.success) {
    const installed = loadJson('installed-skills.json') || { installed: [] };
    installed.installed.push({
      repo,
      method: result.method,
      path: result.path || null,
      installed_at: new Date().toISOString()
    });
    saveJson('installed-skills.json', installed);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
