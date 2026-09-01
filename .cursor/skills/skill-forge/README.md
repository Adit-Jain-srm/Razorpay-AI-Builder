# skill-forge

**Your agent keeps using the same stale knowledge. These are the skills I built to fix that — straight from my daily workflow.**

---

## The Problem

Your AI coding agent has a fixed set of capabilities from the day you installed it. Meanwhile:
- 20,478 skills exist on the marketplace (growing daily)
- New workflows, patterns, and integrations launch every week
- The agent you set up last month is already behind

You don't have time to browse marketplaces, read READMEs, evaluate quality, and install manually. You need an agent that **feeds itself**.

## The Fix

skill-forge is a self-improving meta-agent. It:
1. **Hunts** — Discovers skills across GitHub, marketplaces, blogs, communities (not just one source)
2. **Devours** — Reads each skill deeply, extracts the philosophy and novel techniques
3. **Judges** — Scores quality, validates against the best, rejects mediocrity
4. **Acts** — Installs what fills gaps, creates what doesn't exist yet
5. **Ships** — Publishes novel skills as repos that others can install
6. **Evolves** — Rewrites its own heuristics based on outcomes (RL-weighted)

After every action, it runs a mandatory self-check: "Did I deliver quality? What to improve? Why wasn't it better? Fix NOW."

---

## Install

```bash
npx skills@latest add Adit-Jain-srm/skill-forge
```

<details>
<summary><b>Claude Code</b></summary>

```bash
git clone https://github.com/Adit-Jain-srm/skill-forge.git
claude --plugin-dir ./skill-forge
```
</details>

<details>
<summary><b>Codex / Gemini / Windsurf</b></summary>

```bash
git clone https://github.com/Adit-Jain-srm/skill-forge.git
# Copy skills/ to your agent's skill directory
```
</details>

---

## Skills Included

| Problem | Skill | Behavior Change |
|---------|-------|-----------------|
| "My agent shows me buggy first drafts" | [`self-review`](skills/self-review/) | Reviews own code BEFORE presenting. Catches bugs first-pass. |
| "The agent doesn't speak my project's language" | [`context-builder`](skills/context-builder/) | Builds CONTEXT.md shared vocabulary. 50-75% token reduction. |
| "My agent says 'done' but it's NOT actually done" | [`prove-it`](skills/prove-it/) | Forces evidence before any completion claim. No proof = no "done". |
| "Something is broken and I don't know why" | [`diagnose`](skills/diagnose/) | Forced loop: reproduce → minimise → hypothesise → instrument → fix → test |
| "I need to continue this work later" | [`handoff`](skills/handoff/) | Compacts session into handoff doc another agent can pick up instantly |
| "I'm lost in unfamiliar code" | [`zoom-out`](skills/zoom-out/) | Forces perspective: what system is this, who calls it, what breaks if it changes |
| "My agent uses one tool when it should chain five" | [`mcp-conductor`](skills/mcp-conductor/) | Multi-MCP orchestration: search → scrape → analyze → synthesize |
| "My git history is an unreadable mess" | [`git-workflow`](skills/git-workflow/) | Disciplines: atomic commits, conventional messages, PR readiness |
| "My site is slow and I don't know why" | [`web-perf`](skills/web-perf/) | Measure-first loop: baseline → identify → fix ONE → re-measure |
| "My code breaks in production every night" | [`error-resilience`](skills/error-resilience/) | Retry, circuit breakers, timeouts, graceful degradation |
| "Nobody knows how this codebase works" | [`arch-from-code`](skills/arch-from-code/) | Generates Mermaid/C4 diagrams from actual codebase analysis |
| "My database design breaks at scale" | [`db-schema`](skills/db-schema/) | Queries-first discipline: scale-question before every DDL |
| "First-time setup is confusing" | [`setup`](skills/setup/) | Configures preferences all other skills use |

---

## The Meta-Agent

The root `SKILL.md` is itself a skill — an autonomous loop:

```
/skill-forge              — Full pipeline (discover → judge → act → learn → improve)
/skill-forge discover     — Hunt across internet, not just GitHub
/skill-forge route <task> — "What skill solves this?" → best match + invocation prompt
/skill-forge create       — Validate-against-best → design compound skill → ship
/skill-forge devour       — Maximum: learn everything, fill all gaps
/skill-forge improve      — Self-check + apply all unactioned learnings
```

### Self-Check Quality Gate (runs after every action)

```
1. Did I deliver QUALITY? (not "does it work" — is it EXCELLENT?)
2. What could be better? (there's ALWAYS something)
3. WHY wasn't it better? (root cause your own laziness)
4. Am I actually USING previous learnings?
5. Compared to the BEST — am I even close?
```

---

## Design Philosophy

Inspired by engineering fundamentals, not AI hype:

> "The rate of feedback is your speed limit." — *The Pragmatic Programmer*

> "Invest in the design of the system every day." — *Kent Beck*

> "The best modules are deep: a lot of functionality through a simple interface." — *John Ousterhout*

**Applied to skills:**
- Each skill solves a NAMED PROBLEM (not "a tool that does X")
- Compound capabilities > atomic features
- Self-improvement is mandatory, not optional
- Validate against the best before shipping anything
- Search for PAIN POINTS (Twitter, Reddit, HN, Discord) not just "skills"
- The internet is the perimeter. NO LIMITATIONS TO LEARNING.

---

## Project Structure

```
skill-forge/
├── SKILL.md              # Meta-agent (self-improving discovery + creation engine)
├── skills/               # Compound skills that solve real pain
│   ├── mcp-conductor/    # Multi-MCP orchestration
│   ├── web-perf/         # Core Web Vitals fix
│   ├── git-workflow/     # Git complexity tamed
│   ├── db-schema/        # Production database design
│   ├── arch-from-code/   # Architecture from code analysis
│   └── error-resilience/ # Production error patterns
├── scripts/              # Discovery, analysis, validation, RL
├── memory/               # Persistent learning (RL state, patterns, gaps)
├── docs/                 # Setup guides, skill anatomy, contributing
└── CONTRIBUTING.md       # Quality bar for new skills
```

---

## Quality Bar

Every skill passes automated validation (`node scripts/validate-skill.js`) checking:
- Valid YAML frontmatter with trigger conditions
- Under 500 lines (progressive disclosure for depth)
- Real code examples (not pseudocode)
- Common mistakes section
- Verification checklist (how to prove it worked)

Manual bar: **Would I star this if I found it? Would I switch from what I currently use?**

---

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). Key rule: every skill must solve a NAMED PROBLEM, not describe a feature.

---

## License

MIT
