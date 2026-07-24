# CPA Trace

**Every number, back to its source.**

A review console where a CPA can look at an AI-filled tax return and, for every number on it, answer three questions in about two seconds: where did this come from, should I trust it, and what am I allowed to do about it.

**Live demo:** https://cpatrace-app.vercel.app


---

## The problem

Tax firms are starting to use AI to read client documents and fill in returns. It works — but the CPA who signs the return is personally liable for every number on it, and an AI that's 95% right is still wrong somewhere. That leaves the accountant with a bad choice: trust blindly, or re-check everything by hand, which erases the time the AI just saved.

CPA Trace is built around one goal: **make verifying the AI faster than redoing the work.** The interface routes the CPA's attention to exactly the numbers that need a human, and makes the safe ones confirmable in a single click.

## Challenges covered

I chose **01 (Source Traceability), 07 (Actionable Dashboard), 08 (Clickable vs. Editable), and 10 (Trustworthy AI).**

These four share one data structure. A return field is modeled as an object carrying its value, its source, its confidence, its review state, and its full edit history. Once that object exists, each challenge is one view of it:

- **01** renders where a value came from (five different provenance types)
- **08** renders what state a field is in (a six-state visual grammar)
- **10** renders the AI's confidence and the correction workflow
- **07** aggregates state across returns to rank the work queue

Building them together let me prove the system across contexts rather than in isolation. See [`docs/data-model.md`](docs/data-model.md) for the full model.

## What's real vs. simulated

Per the brief, the AI is faked and the interface is real. Concretely:

**Simulated:**
- **No OCR or document parsing.** Source documents are hardcoded and rendered as HTML mockups, with highlight coordinates baked into the data. The blurry scan is a CSS filter.
- **No AI model.** Extraction, confidence scores, conflict picks, and anomaly flags are all hand-authored JSON — that JSON *is* the "AI." It's internally consistent (totals really sum, the SALT cap really applies, the $3,000 capital-loss limit really bites).
- **No backend or persistence.** State lives in memory and resets on refresh. (This is convenient for demoing — refresh gives you a clean slate.)
- **No auth.** The current user is hardcoded.

**Real:**
- The full field **state machine** — verify, correct, resolve conflict, approve/reject — with legal transitions enforced.
- The **cascade**: correcting an input recomputes every downstream total.
- The **sign-off rule**: a return can't be marked ready while any field is unreviewed.
- The **$5,000 approval routing**: a large correction is auto-sent for second review.
- The **dashboard ranking logic** — a real scoring function over the mock returns.
- The whole UI, every interaction, all edge cases wired.

## Where the AI actually is

The model is stubbed, but the AI *engineering* is real — it's the layer that makes model output safe to act on:

- **Confidence policy** — thresholds (0.90 / 0.70), and below 0.70 a field auto-routes to review. Raw scores never appear alone; they're always paired with a reason.
- **Confidence inheritance** — computed fields take the *minimum* of their inputs, not the average: one weak input poisons the total.
- **Where confidence is meaningless** — client answers and carryforwards show no score, because no model judged them. Faking one would devalue every real score.
- **Autonomy boundaries** — on a document conflict the AI recommends and explains, but cannot resolve. A human decides.
- **The audit trail as an eval set** — every verify/correct is a labeled example. Corrections clustered at low confidence mean the model is calibrated; corrections at high confidence are the fire alarm.

## Design decisions worth calling out

- **State and provenance are independent axes.** Overriding the AI (`corrected`) is a different thing from endorsing it (`verified`), and both are separate from where the value originated.
- **Only flagged fields are loud.** Exactly one state (`needs_review`) is styled to demand attention. If everything shouts, nothing does — the interface allocates attention proportionally to risk.
- **Locked fields state their reason** and offer a path to resolve, rather than being dead ends.
- **Computed totals are never edited directly** — you edit the inputs and the total recomputes, so a total's value is always defensible.
- **The dashboard ranks by what needs the human now.** Deadline proximity dominates; returns blocked on the client sink to the bottom, because unfinished is not the same as actionable.

## How I'd measure success

If this shipped, the north-star metric is **median time-to-decision per field** — verifying should be measurably faster than manual entry. Supporting signals:
- **Rubber-stamp detector:** correction rate on high-confidence fields (should be near zero).
- **Alarm-fatigue detector:** what fraction of flags lead to an actual correction (flags should usually mean something).
- **Dead-end detector:** how often a CPA leaves the app to open the source PDF by hand.

The app's own audit trail is what generates the data for all of these.

## Out of scope

Deliberately not built, to keep the four chosen challenges deep rather than the whole thing shallow:
- The client-facing portal (this is the preparer/reviewer console)
- Role-aware experiences (challenge 05) and the collaboration layer (02)
- Only the Martinez return has full field data; the other returns populate the dashboard to demonstrate ranking.
- [CONFIRM: mention pending_approval here if you left it partial — otherwise delete this line]

## Running locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints. Built with React + Vite + Tailwind.

## Where to start when reviewing

1. The dashboard ranks 15 returns — open **Maria & Carlos Martinez** (the one with full data).
2. Click any field to trace it to its source document on the right.
3. Open **Interest — Chase Bank** to see a document conflict; resolve it and watch the interest total recompute.
4. Open **Real estate taxes** for a low-confidence extraction from a blurry scan.
5. Try to file the return — the sign-off rule blocks it while fields are unreviewed.