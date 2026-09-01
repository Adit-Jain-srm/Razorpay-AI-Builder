#!/usr/bin/env node
/**
 * skill-forge skill validator
 * Validates a SKILL.md against quality standards before publishing.
 * 
 * Usage: node validate-skill.js <path-to-skill-directory>
 * 
 * Checks:
 * - SKILL.md exists
 * - Valid YAML frontmatter with name + description
 * - Under 500 lines
 * - Description includes trigger conditions ("Use when" or "WHEN")
 * - Has required sections (Overview or Quick Start, When to Use)
 * - Has code examples (```)
 * - No placeholder text ({your-thing-here})
 * - Name matches directory name
 */

const fs = require('fs');
const path = require('path');

function validate(skillDir) {
  const errors = [];
  const warnings = [];
  const info = [];

  const skillMdPath = path.join(skillDir, 'SKILL.md');

  if (!fs.existsSync(skillMdPath)) {
    errors.push('SKILL.md not found in ' + skillDir);
    return { errors, warnings, info, valid: false };
  }

  const content = fs.readFileSync(skillMdPath, 'utf8');
  const lines = content.split('\n');

  // Check line count
  if (lines.length > 500) {
    errors.push(`SKILL.md is ${lines.length} lines (max 500). Split into SKILL.md + reference.md`);
  } else if (lines.length > 400) {
    warnings.push(`SKILL.md is ${lines.length} lines. Consider splitting at 400+`);
  }
  info.push(`Line count: ${lines.length}`);

  // Check frontmatter
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    errors.push('Missing YAML frontmatter (---\\n...\\n---)');
  } else {
    const fm = fmMatch[1];
    if (!fm.includes('name:')) errors.push('Frontmatter missing "name" field');
    if (!fm.includes('description:')) errors.push('Frontmatter missing "description" field');

    const nameMatch = fm.match(/^name:\s*(.+)/m);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      const dirName = path.basename(skillDir);
      if (name !== dirName && name !== dirName.replace(/-skill$/, '')) {
        warnings.push(`Name "${name}" doesn't match directory "${dirName}"`);
      }
      if (!/^[a-z0-9-]+$/.test(name)) {
        errors.push(`Name must be lowercase letters, numbers, hyphens only. Got: "${name}"`);
      }
      if (name.length > 64) {
        errors.push(`Name exceeds 64 characters: ${name.length}`);
      }
      info.push(`Name: ${name}`);
    }

    // Check description quality
    const descText = fm.includes('description:') ? fm.split('description:')[1].split('\n')[0] : '';
    if (descText.length < 20 && !fm.includes('>-')) {
      warnings.push('Description seems too short (< 20 chars)');
    }
    if (!content.toLowerCase().includes('use when') && !content.toLowerCase().includes('when to use')) {
      warnings.push('No "Use when" trigger conditions found in description or body');
    }
  }

  // Check for required sections
  const hasOverview = /^##\s*(Overview|Quick Start|What This Does)/im.test(content);
  const hasWhenToUse = /^##\s*(When to Use|Triggers|Use When)/im.test(content);
  const hasWorkflow = /^##\s*(Process|Workflow|How|Quick Start|Steps|Fix)/im.test(content);
  const hasMistakes = /^##\s*(Common Mistake|Anti-Pattern|Pitfall|Don't|Avoid)/im.test(content);

  if (!hasOverview) warnings.push('Missing Overview or Quick Start section');
  if (!hasWhenToUse && !content.includes('Use when')) warnings.push('Missing "When to Use" section');
  if (!hasWorkflow) warnings.push('Missing Process/Workflow section');
  if (!hasMistakes) warnings.push('Missing Common Mistakes section');

  // Check for code examples
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  if (codeBlocks === 0) {
    errors.push('No code examples found. Skills must include actionable code.');
  } else {
    info.push(`Code blocks: ${Math.floor(codeBlocks)}`);
  }

  // Check for placeholder text
  if (content.includes('{your-') || content.includes('<!-- TODO') || content.includes('<!-- Agent will fill')) {
    errors.push('Contains placeholder text. All content must be production-ready.');
  }

  // Check for actionability (no vague advice)
  const vaguePatterns = ['consider your', 'think about', 'keep in mind that', 'it depends on'];
  for (const pattern of vaguePatterns) {
    if (content.toLowerCase().includes(pattern)) {
      warnings.push(`Potentially vague advice: "${pattern}" — ensure it's followed by specific action`);
    }
  }

  const valid = errors.length === 0;

  return { errors, warnings, info, valid };
}

function main() {
  const skillDir = process.argv[2];

  if (!skillDir) {
    console.error('Usage: node validate-skill.js <path-to-skill-directory>');
    console.error('Example: node validate-skill.js skills/web-perf');
    process.exit(1);
  }

  const resolvedPath = path.resolve(skillDir);
  console.log(`\nValidating: ${resolvedPath}\n`);

  const result = validate(resolvedPath);

  if (result.info.length > 0) {
    console.log('INFO:');
    result.info.forEach(i => console.log(`  ℹ ${i}`));
    console.log('');
  }

  if (result.errors.length > 0) {
    console.log('ERRORS (must fix):');
    result.errors.forEach(e => console.log(`  ✗ ${e}`));
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('WARNINGS (should fix):');
    result.warnings.forEach(w => console.log(`  ⚠ ${w}`));
    console.log('');
  }

  if (result.valid) {
    console.log('✓ VALID — Skill passes quality checks\n');
  } else {
    console.log('✗ INVALID — Fix errors above before publishing\n');
    process.exit(1);
  }
}

main();
