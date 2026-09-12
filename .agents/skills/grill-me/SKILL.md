---
name: grill-me
description: Go through the whole decision tree with me. Only use when I mention grilling or ask you to grill me on an idea, plan, or design.
disable-model-invocation: true
---

Read `AGENTS.md` and `openspec/config.yaml` before starting. Run `npm run --silent openspec -- list --specs` and `npm run --silent openspec -- list --json`, then read relevant existing specs and active changes. Inventory available project documents with `rg --files docs` and follow relevant links in the README and project instructions. Read the product notes, architecture, research, and other documents that inform this idea, using suitable readers for non-Markdown files. Inspect relevant code to distinguish current behavior from intended behavior. Empty spec or change lists do not block discussion. Report material sources you cannot read and surface conflicting information.

Follow the user's stated scope. For nontechnical teammates, ask about users, behavior, exclusions, and how they will recognize success. Explain technical trade-offs only when they change those decisions. Clarify what the requested outcome changes about existing specs and documents. Stop at enough context for actionable issues; do not require engineering design or tasks before a handoff.

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Map the plan as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds of chat questions**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask now without guessing at answers you haven't heard yet. Ask the whole frontier in one round: up to 4 questions, numbered, each with its options as short bullets, your recommended option first labeled "(Recommended)", and the real trade-off named in one line per option. Chunk a larger frontier by priority and carry the rest into the next round.

Keep each question short enough that I can answer the whole round in one reply; ask me to answer by question number. A question that needs a long body, or that you expect me to answer selectively or defer, gets no options — ask it standalone and let me answer in prose.

Wait for my answers before the next round. Each round reshapes the tree — settled decisions push the frontier outward. Recompute the frontier and ask the next round. A question whose answer depends on a question still open in this round belongs to a later round, not this one.

Finding **facts** is your job, never mine. When a frontier question needs a fact from the codebase or environment, look it up with your tools — never ask me for anything you could find yourself. A fact still being explored counts as an unsettled prerequisite: only questions downstream of it wait; ask the rest of the frontier now.

Keep asking until I confirm we've reached a shared understanding. Surface unresolved questions and explain which decisions depend on them. I decide what to settle, defer, or leave open. Continue independent questions while others remain unresolved. Do not implement the plan without my authorization.

## Handle detours

If I do not understand a question or want to leave the current path, pause the round and follow that detour. Do not make me answer the remaining questions at the same time.

For example, if I do not understand question 1, explain it until I can answer it. Then continue the round.

## Hand off agreed decisions

Finish with a short record of the agreed outcome, scope, exclusions, acceptance examples, relevant source documents, and unresolved questions. Keep it in the conversation unless the user asks to save it. When asked for issues or an engineering handoff, use the installed `ticket-handoff` skill to prepare one issue or several when the work needs splitting. Do not repeat settled questions or require an OpenSpec change first. Engineering picks up the resulting issues and creates the OpenSpec change, design, and implementation tasks. An explicit request for an OpenSpec proposal can still use `openspec-propose` directly.
