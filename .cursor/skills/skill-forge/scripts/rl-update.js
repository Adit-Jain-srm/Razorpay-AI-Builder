#!/usr/bin/env node
/**
 * skill-forge reinforcement learning engine
 * Updates RL state based on outcome signals.
 * Uses Exponential Moving Average (EMA) for all weight updates.
 * 
 * Usage: node rl-update.js --signal <signal_type> --source <source> [--value <0-1>] [--details "..."]
 * 
 * Signal types:
 *   skill_useful       - installed skill was invoked/used (+1.0)
 *   skill_starred      - published skill got stars (+1.0)
 *   skill_engagement   - published skill got issues/PRs (+0.5)
 *   skill_unused       - created skill never used (-0.5)
 *   source_novel       - discovery source yielded novel result (+0.8)
 *   source_stale       - discovery source returned only known skills (-0.3)
 *   routing_hit        - task routing was correct (+0.8)
 *   routing_miss       - task routing missed better option (-0.4)
 *   creation_success   - published skill gained traction (+1.0)
 *   creation_failure   - published skill got 0 engagement (-0.5)
 */

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

function ema(oldValue, signal, alpha) {
  return alpha * signal + (1 - alpha) * oldValue;
}

function clamp(value, min = 0.0, max = 1.0) {
  return Math.max(min, Math.min(max, value));
}

const SIGNAL_CONFIG = {
  skill_useful: { reward: 1.0, dimension: 'routing_accuracy', alpha: 0.2 },
  skill_starred: { reward: 1.0, dimension: 'creation_success', alpha: 0.25 },
  skill_engagement: { reward: 0.5, dimension: 'creation_success', alpha: 0.2 },
  skill_unused: { reward: -0.5, dimension: 'creation_success', alpha: 0.15 },
  source_novel: { reward: 0.8, dimension: 'source_weights', alpha: 0.3 },
  source_stale: { reward: -0.3, dimension: 'source_weights', alpha: 0.2 },
  routing_hit: { reward: 0.8, dimension: 'routing_accuracy', alpha: 0.2 },
  routing_miss: { reward: -0.4, dimension: 'routing_accuracy', alpha: 0.25 },
  creation_success: { reward: 1.0, dimension: 'creation_success', alpha: 0.25 },
  creation_failure: { reward: -0.5, dimension: 'creation_success', alpha: 0.2 }
};

function updateSourceWeight(state, source, signal, alpha) {
  if (!state.source_weights[source]) {
    state.source_weights[source] = { weight: 0.5, hits: 0, novel_finds: 0 };
  }
  const entry = state.source_weights[source];
  entry.hits++;
  if (signal > 0) entry.novel_finds++;
  entry.weight = clamp(ema(entry.weight, signal > 0 ? 1.0 : 0.0, alpha));
}

function updateRoutingAccuracy(state, isHit) {
  state.routing_accuracy.total_routes++;
  if (isHit) state.routing_accuracy.successful_routes++;
  state.routing_accuracy.accuracy = state.routing_accuracy.successful_routes / state.routing_accuracy.total_routes;
}

function updateCreationSuccess(state, signal, details) {
  if (signal > 0 && details) {
    state.creation_success.total_stars += parseInt(details) || 1;
  }
}

function updateCategoryWeight(state, category, signal, alpha) {
  if (!state.category_weights[category]) {
    state.category_weights[category] = { weight: 0.5, created: 0, stars: 0 };
  }
  const entry = state.category_weights[category];
  entry.weight = clamp(ema(entry.weight, signal > 0 ? 1.0 : 0.0, alpha));
  if (signal > 0) entry.stars += parseInt(signal) || 1;
}

function updateEpsilon(state) {
  const totalCycles = state.total_cycles || 0;
  state.epsilon = Math.max(0.10, 0.25 - 0.01 * Math.floor(totalCycles / 20));
}

function main() {
  const args = process.argv.slice(2);
  const signalIdx = args.indexOf('--signal');
  const sourceIdx = args.indexOf('--source');
  const valueIdx = args.indexOf('--value');
  const detailsIdx = args.indexOf('--details');
  const categoryIdx = args.indexOf('--category');

  if (signalIdx < 0) {
    console.error('Usage: node rl-update.js --signal <type> --source <source> [--value <n>] [--category <cat>] [--details "..."]');
    console.error('\nSignal types: ' + Object.keys(SIGNAL_CONFIG).join(', '));
    process.exit(1);
  }

  const signalType = args[signalIdx + 1];
  const source = sourceIdx >= 0 ? args[sourceIdx + 1] : 'unknown';
  const value = valueIdx >= 0 ? parseFloat(args[valueIdx + 1]) : null;
  const details = detailsIdx >= 0 ? args[detailsIdx + 1] : null;
  const category = categoryIdx >= 0 ? args[categoryIdx + 1] : null;

  if (!SIGNAL_CONFIG[signalType]) {
    console.error(`Unknown signal type: ${signalType}`);
    console.error('Valid types: ' + Object.keys(SIGNAL_CONFIG).join(', '));
    process.exit(1);
  }

  const config = SIGNAL_CONFIG[signalType];
  const state = loadJson('rl-state.json');

  if (!state) {
    console.error('rl-state.json not found');
    process.exit(1);
  }

  const reward = value !== null ? value : config.reward;

  switch (config.dimension) {
    case 'source_weights':
      updateSourceWeight(state, source, reward, config.alpha);
      break;
    case 'routing_accuracy':
      updateRoutingAccuracy(state, reward > 0);
      break;
    case 'creation_success':
      updateCreationSuccess(state, reward, details);
      break;
  }

  if (category) {
    updateCategoryWeight(state, category, reward, config.alpha);
  }

  state.total_cycles = (state.total_cycles || 0) + 1;
  updateEpsilon(state);

  if (!state.learnings) state.learnings = [];
  state.learnings.push(`[${new Date().toISOString()}] ${signalType} from ${source}: reward=${reward}`);
  if (state.learnings.length > 100) state.learnings = state.learnings.slice(-100);

  saveJson('rl-state.json', state);

  appendLog({
    timestamp: new Date().toISOString(),
    event: 'rl_update',
    signal: signalType,
    source,
    reward,
    category,
    details,
    epsilon: state.epsilon
  });

  console.log(JSON.stringify({
    updated: true,
    signal: signalType,
    source,
    reward,
    new_epsilon: state.epsilon,
    total_cycles: state.total_cycles
  }, null, 2));
}

main();
