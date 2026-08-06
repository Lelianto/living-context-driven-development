# LCDD Cost Analysis — What Costs Money, What's Optional

**Status:** Guide  
**Version:** 0.2.1

---

## Overview

LCDD is designed so you can start with zero financial cost. The methodology works with just a CLI, some YAML files, and your existing CI pipeline. Everything beyond that is incremental — you add cost only when the value justifies it.

---

## Cost Drivers (Ranked by Impact)

### 1. LLM API Calls

**What triggers this cost:** Automated pipeline stages (01–05, 09).

**Cost per document processed:**

| Model | Cost per 200-page PDF | Monthly (50 docs) | Monthly (500 docs) |
|---|---|---|---|
| GPT-4o | ~$0.15 | ~$7.50 | ~$75 |
| GPT-4o-mini | ~$0.02 | ~$1.00 | ~$10 |
| Claude 3.5 Sonnet | ~$0.20 | ~$10 | ~$100 |
| Llama 3 (local/Ollama) | $0 (your hardware) | $0 | $0 |

**Mitigation:** You can run the local model path (Ollama + Llama) for zero API cost if you have a machine with 16GB+ RAM.

**Verdict:** Largest variable cost, but only applies if you use the automated pipeline. **Entirely optional.**

---

### 2. Registry Infrastructure

**What triggers this cost:** Database-backed Registry instead of file-based.

| Setup | Monthly Cost | When You Need It |
|---|---|---|
| **File-based (YAML in `.lcdd/`)** | $0 | Default. Works for teams up to ~50 people. |
| **PostgreSQL (managed, e.g., Supabase/RDS)** | $0–$25 | When you need concurrent writes, dashboards, or multi-team access. |
| **Enterprise (HA + event sourcing)** | $200+ | Regulated industries needing full audit trail, multi-region, SLA. |

**Verdict:** File-based is free and works for 90% of teams. Database cost is optional and scales with team size.

---

### 3. Observability Dashboard

**What triggers this cost:** Grafana, Datadog, or custom dashboard.

| Setup | Monthly Cost |
|---|---|
| **No dashboard (CLI + event log)** | $0 |
| **Self-hosted Grafana** | $0 (your server) |
| **Grafana Cloud (free tier)** | $0 (up to 10K metrics) |
| **Datadog/New Relic** | $15+ |

**Verdict:** Free tier or self-hosted Grafana covers most teams. Premium observability is optional.

---

### 4. Human Time

**What triggers this cost:** Writing contexts, reviewing candidates, governance processes.

| Activity | Frequency | Time |
|---|---|---|
| Writing a context (manual) | Per new rule | 5–15 minutes |
| Reviewing a candidate context | Per candidate | 2–5 minutes |
| Quarterly context review | Per active context | 2 minutes |
| Hardened context approval (RFC) | Per change | 15–30 minutes |

**Estimate for a 50-context team:** ~2 hours/month for maintenance. This is time already spent on governance — just structured.

**Verdict:** Not new cost — you already spend this time on ad-hoc governance (Slack discussions, wiki updates, PR debates). LCDD makes it visible and reduces it over time.

---

## What's Completely Free (Always)

| Component | Cost |
|---|---|
| `@lcdd/cli` (npm) | $0 |
| `@lcdd/core` (npm) | $0 |
| File-based Context Registry (`.lcdd/`) | $0 |
| `lcd validate` in CI (GitHub Actions free tier) | $0 |
| Manual context authoring | $0 |
| Lifecycle management (`lcd transition`) | $0 |
| CQL querying | $0 |
| Context Packs (community) | $0 |
| Specification + methodology docs | $0 |

---

## What Costs Money (And When)

| Component | Cost Trigger | Monthly Estimate | Optional? |
|---|---|---|---|
| LLM extraction (GPT-4o) | Automated pipeline, 50 docs/month | ~$8 | ✅ Fully optional |
| LLM extraction (local) | Automated pipeline, local GPU | $0 (your electricity) | ✅ Fully optional |
| Database Registry | Team > 50, multi-team | $0–$25 | ✅ Optional (file-based works) |
| Grafana Dashboard | Want visual metrics | $0 (self-hosted) | ✅ Optional |
| Premium Observability | Datadog/New Relic | $15+ | ✅ Optional |
| GitHub Actions minutes | Heavy CI usage | $0 (free tier: 2000 min/month) | ✅ Free for most |

---

## Adoption Path by Budget

### Path A: Zero Budget (Solo / Indie Hacker)

```
lcd init → manual context authoring → lcd validate in CI
```
**Cost:** $0/month. No LLM, no database, no dashboard. Full governance value.

### Path B: Startup Budget (~$10/month)

```
Path A + GPT-4o-mini for automated extraction (key regulations only)
```
**Cost:** ~$10/month. Automated discovery for critical sources, manual for the rest.

### Path C: Team Budget (~$50/month)

```
Path B + PostgreSQL Registry + self-hosted Grafana
```
**Cost:** ~$50/month. Multi-team access, dashboards, automated pipeline for all sources.

### Path D: Enterprise Budget ($500+/month)

```
Path C + GPT-4o + HA infrastructure + Dedicated compliance worker
```
**Cost:** $500+/month. Full automation, SLA-backed, multi-region, audit-grade.

---

## The Biggest Cost Is Inaction

The most expensive thing you can do with LCDD is **not use it**. The cost of:

- Missing a regulatory update ($10K–$10M in fines)
- An AI agent introducing specification drift (weeks of debugging)
- A security incident from a constraint nobody knew existed (breach cost)
- Engineering time lost to ad-hoc governance debates (hours/week)

...dwarfs the operational cost of LCDD by orders of magnitude.

---

## Recommendation

**Start with Path A ($0).** Prove value with manual contexts + CI enforcement. Only add automation when:
1. You have > 20 active contexts (manual maintenance becomes tedious)
2. You operate in a regulated industry (compliance risk justifies LLM cost)
3. You have multiple teams (need database Registry + dashboards)

LCDD is designed so the free tier is genuinely useful — not a crippled demo.
