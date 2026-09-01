#!/usr/bin/env node
/**
 * skill-forge repo scaffolding
 * Creates a new skill repo structure compatible with `npx skills add`.
 * 
 * Usage: node scaffold-repo.js --name "skill-name" --description "..." --dir "/path/to/create"
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'memory');

function loadJson(filename) {
  const filepath = path.join(MEMORY_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function generateSkillMd(name, description, purpose, instructions) {
  return `---
name: ${name}
description: >-
  ${description}
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

${purpose}

## Quick Start

${instructions || '<!-- Agent will fill this based on domain research -->'}

## When to Use

Use this skill when:
- <!-- Specific trigger condition 1 -->
- <!-- Specific trigger condition 2 -->

## Workflow

1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Step 3 -->

## Examples

\`\`\`
<!-- Concrete example showing the skill in action -->
\`\`\`

## Common Mistakes

- <!-- Pitfall 1 and how to avoid -->
- <!-- Pitfall 2 and how to avoid -->
`;
}

function generateReadme(name, description, githubUser) {
  const title = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return `# ${title}

${description}

## Install

\`\`\`bash
npx skills add ${githubUser}/${name}
\`\`\`

## What This Solves

<!-- One paragraph explaining the pain point this eliminates -->

## Before / After

**Without this skill:**
<!-- What the experience looks like without it -->

**With this skill:**
<!-- What the experience looks like with it -->

## How It Works

This skill teaches your AI agent to:
- <!-- Capability 1 -->
- <!-- Capability 2 -->
- <!-- Capability 3 -->

## Compatibility

Works with any agent that supports the [SKILL.md standard](https://agentskills.io/specification):
- Cursor
- Claude Code
- GitHub Copilot (Codex CLI)
- Windsurf
- And 40+ others

## License

MIT
`;
}

function generatePackageJson(name, description, githubUser) {
  return JSON.stringify({
    name: `@${githubUser}/${name}`,
    version: "1.0.0",
    description,
    keywords: ["cursor-skill", "agent-skills", "ai-skill", "cursor", "ai-agent"],
    repository: {
      type: "git",
      url: `https://github.com/${githubUser}/${name}`
    },
    license: "MIT",
    files: ["SKILL.md", "reference.md", "scripts/"]
  }, null, 2);
}

function main() {
  const args = process.argv.slice(2);
  const nameIdx = args.indexOf('--name');
  const descIdx = args.indexOf('--description');
  const dirIdx = args.indexOf('--dir');
  const userIdx = args.indexOf('--user');
  const purposeIdx = args.indexOf('--purpose');

  if (nameIdx < 0 || descIdx < 0) {
    console.error('Usage: node scaffold-repo.js --name "skill-name" --description "..." [--dir "/path"] [--user "github-user"] [--purpose "..."]');
    process.exit(1);
  }

  const name = args[nameIdx + 1];
  const description = args[descIdx + 1];
  const dir = dirIdx >= 0 ? args[dirIdx + 1] : path.join(process.cwd(), name);
  const githubUser = userIdx >= 0 ? args[userIdx + 1] : 'Adit-Jain-srm';
  const purpose = purposeIdx >= 0 ? args[purposeIdx + 1] : '';

  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });

  fs.writeFileSync(path.join(dir, 'SKILL.md'), generateSkillMd(name, description, purpose, ''));
  fs.writeFileSync(path.join(dir, 'README.md'), generateReadme(name, description, githubUser));
  fs.writeFileSync(path.join(dir, 'package.json'), generatePackageJson(name, description, githubUser));
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n.DS_Store\n');
  fs.writeFileSync(path.join(dir, 'LICENSE'), `MIT License\n\nCopyright (c) ${new Date().getFullYear()} ${githubUser}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`);

  const output = {
    created: true,
    directory: dir,
    files: ['SKILL.md', 'README.md', 'package.json', '.gitignore', 'LICENSE', 'scripts/'],
    next_steps: [
      `Edit ${path.join(dir, 'SKILL.md')} with full skill content`,
      `Edit ${path.join(dir, 'README.md')} to sell the skill`,
      `Run: cd "${dir}" && git init && git add . && git commit -m "feat: initial ${name} skill"`,
      `Run: gh repo create ${githubUser}/${name} --public --source . --push`,
      `Run: gh repo edit ${githubUser}/${name} --add-topic cursor-skill,agent-skills,ai-skill`
    ]
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
