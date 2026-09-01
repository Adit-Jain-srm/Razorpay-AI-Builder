#!/usr/bin/env node
/**
 * skill-forge self-improvement engine
 * Monitors published skills, collects feedback, updates RL state,
 * identifies what's underperforming, and suggests/applies improvements.
 * 
 * Usage: node self-improve.js [--mode <monitor|improve|full>]
 * 
 * Modes:
 *   monitor  - Check published repos for stars/issues/forks, update metrics
 *   improve  - Analyze weaknesses, suggest improvements to own strategies
 *   full     - Monitor + Improve + Persist
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

function appendLog(entry) {
  const logPath = path.join(MEMORY_DIR, 'evolution-log.jsonl');
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
}

function monitorPublishedRepos() {
  const published = loadJson('published.json');
  if (!published || !published.repos || published.repos.length === 0) {
    return { monitored: 0, updates: [] };
  }

  const updates = [];

  for (const repo of published.repos) {
    try {
      const cmd = `gh repo view ${repo.full_name} --json stargazerCount,forkCount,issues,updatedAt 2>&1`;
      const result = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      const data = JSON.parse(result);

      const prevStars = repo.stars || 0;
      const newStars = data.stargazerCount || 0;
      const starDelta = newStars - prevStars;

      repo.stars = newStars;
      repo.forks = data.forkCount || 0;
      repo.open_issues = (data.issues || []).length;
      repo.last_checked = new Date().toISOString();

      if (starDelta > 0) {
        updates.push({
          repo: repo.full_name,
          type: 'stars_gained',
          delta: starDelta,
          total: newStars
        });
      }

      if (repo.open_issues > (repo.prev_issues || 0)) {
        updates.push({
          repo: repo.full_name,
          type: 'new_issues',
          count: repo.open_issues
        });
      }
      repo.prev_issues = repo.open_issues;
    } catch (e) {
      console.error(`[monitor] Failed to check ${repo.full_name}: ${e.message}`);
    }
  }

  published.total_published = published.repos.length;
  saveJson('published.json', published);

  return { monitored: published.repos.length, updates };
}

function updateReputationMetrics() {
  const published = loadJson('published.json');
  const rlState = loadJson('rl-state.json');

  if (!published || !rlState) return;

  let totalStars = 0, totalForks = 0, totalIssues = 0;
  for (const repo of (published.repos || [])) {
    totalStars += repo.stars || 0;
    totalForks += repo.forks || 0;
    totalIssues += repo.open_issues || 0;
  }

  rlState.reputation_metrics = {
    total_repos: (published.repos || []).length,
    total_stars: totalStars,
    total_forks: totalForks,
    total_issues: totalIssues,
    star_velocity_per_week: calculateStarVelocity(published.repos || [])
  };

  rlState.creation_success.total_published = (published.repos || []).length;
  rlState.creation_success.total_stars = totalStars;

  saveJson('rl-state.json', rlState);
}

function calculateStarVelocity(repos) {
  if (repos.length === 0) return 0;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let recentStars = 0;
  for (const repo of repos) {
    if (new Date(repo.published_at || 0).getTime() > weekAgo) {
      recentStars += repo.stars || 0;
    }
  }
  return recentStars;
}

function analyzeWeaknesses() {
  const rlState = loadJson('rl-state.json');
  const published = loadJson('published.json');
  const learnings = loadJson('learnings.json');
  const gaps = loadJson('gaps.json');

  const weaknesses = [];

  if (rlState) {
    for (const [source, data] of Object.entries(rlState.source_weights || {})) {
      if (data.hits > 5 && data.weight < 0.3) {
        weaknesses.push({
          area: 'discovery',
          detail: `Source "${source}" consistently underperforms (weight: ${data.weight.toFixed(2)}, ${data.hits} hits, ${data.novel_finds} novel)`,
          suggestion: `Deprioritize "${source}" or change search queries for this source`
        });
      }
    }

    if (rlState.routing_accuracy.total_routes > 5 && rlState.routing_accuracy.accuracy < 0.5) {
      weaknesses.push({
        area: 'routing',
        detail: `Routing accuracy is ${(rlState.routing_accuracy.accuracy * 100).toFixed(0)}% (below 50% threshold)`,
        suggestion: 'Improve tokenization, add semantic matching, or expand skill descriptions in knowledge base'
      });
    }

    if (rlState.reputation_metrics.total_repos > 3 && rlState.reputation_metrics.total_stars < 10) {
      weaknesses.push({
        area: 'reputation',
        detail: `${rlState.reputation_metrics.total_repos} repos but only ${rlState.reputation_metrics.total_stars} total stars`,
        suggestion: 'Study reputation-playbook.json patterns more closely. Consider rewriting READMEs of existing repos.'
      });
    }
  }

  if (published && published.repos) {
    const zeroStarRepos = published.repos.filter(r => (r.stars || 0) === 0);
    if (zeroStarRepos.length > 2) {
      weaknesses.push({
        area: 'creation_quality',
        detail: `${zeroStarRepos.length} published repos with 0 stars`,
        suggestion: 'These skills may solve wrong problems or have poor marketing. Review and either improve or archive.'
      });
    }
  }

  if (learnings && (learnings.total_learnings || 0) < 10 && (rlState?.total_cycles || 0) > 5) {
    weaknesses.push({
      area: 'learning_extraction',
      detail: `Only ${learnings.total_learnings || 0} learnings after ${rlState?.total_cycles || 0} cycles`,
      suggestion: 'Increase depth of analysis. Read more skills per cycle. Extract philosophy, not just patterns.'
    });
  }

  if (gaps && (gaps.total_gaps || 0) === 0 && (rlState?.total_cycles || 0) > 3) {
    weaknesses.push({
      area: 'anti_laziness',
      detail: 'No gaps identified despite multiple cycles',
      suggestion: 'Anti-laziness scanner not aggressive enough. Try: "What would make every installed skill 10x better?"'
    });
  }

  return weaknesses;
}

function generateImprovementPlan(weaknesses) {
  if (weaknesses.length === 0) {
    return { status: 'healthy', improvements: [] };
  }

  const improvements = weaknesses.map(w => ({
    priority: w.area === 'reputation' ? 'high' : w.area === 'creation_quality' ? 'high' : 'medium',
    area: w.area,
    action: w.suggestion,
    estimated_impact: w.area === 'reputation' ? 'direct star growth' : 'indirect quality improvement'
  }));

  improvements.sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1));

  return { status: 'improvements_needed', improvements };
}

function main() {
  const args = process.argv.slice(2);
  const modeIdx = args.indexOf('--mode');
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'full';

  const output = { mode, timestamp: new Date().toISOString() };

  if (mode === 'monitor' || mode === 'full') {
    output.monitoring = monitorPublishedRepos();
    updateReputationMetrics();
  }

  if (mode === 'improve' || mode === 'full') {
    const weaknesses = analyzeWeaknesses();
    output.weaknesses = weaknesses;
    output.improvement_plan = generateImprovementPlan(weaknesses);

    if (weaknesses.length > 0) {
      appendLog({
        timestamp: new Date().toISOString(),
        event: 'self_improvement_analysis',
        weaknesses_found: weaknesses.length,
        areas: weaknesses.map(w => w.area)
      });
    }
  }

  console.log(JSON.stringify(output, null, 2));
}

main();
