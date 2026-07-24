# Data Model

The whole app hangs off one idea: **a number on a return isn't just a value — it's an object that carries its own history.** Every field knows where it came from, how it got there, and everything that's happened to it since.

Two independent axes describe every field: its **state** (where it is in review) and its **provenance** (where the value came from). A field always has exactly one of each, in any combination.

## Field shape

```jsonc
{
  "id": "f_mort_int",
  "form": "Sch A", "line": "8a",
  "label": "Home mortgage interest",
  "value": 18204.77,
  "state": "corrected",          // review lifecycle — see below
  "provenance": { "type": "extracted", ... },  // origin — see below
  "flags": [ ... ],              // the AI's own doubts
  "edit_history": [ ... ]        // audit trail, every change appended
}
```

## Axis 1 — State

Where the field sits in the review process.

| State | Meaning |
|---|---|
| `ai_suggested` | AI filled it; no human has looked yet |
| `needs_review` | AI filled it but flagged a doubt — must be looked at |
| `verified` | A human confirmed the AI's value |
| `corrected` | A human overrode it; the AI's original is kept in history |
| `pending_approval` | A large correction, waiting on a second reviewer |
| `locked` | Read-only, always with a stated reason |

**One rule gives states teeth:** a return can't be marked ready-to-file while any field is `ai_suggested`, `needs_review`, or `pending_approval`. That's the anti-rubber-stamp mechanism — review has to actually happen.

Only `needs_review` is styled "loud." If everything shouts, nothing does.

## Axis 2 — Provenance

Where the value came from. Each type needs different evidence on screen.

| Type | Value came from | Confidence shown? |
|---|---|---|
| `extracted` | Read off a document — highlight the exact spot | Yes (read certainty) |
| `computed` | A formula over other fields — no page exists | Yes (min of inputs) |
| `carried_forward` | Last year's filed return | No (implicit 1.0) |
| `client_provided` | A questionnaire answer | **No** |
| `conflicted` | Two documents disagree | Per candidate |

**Confidence appears only where a model actually made a judgment.** Client answers and carryforwards get no badge — faking a score there would devalue every real one.

`computed` fields are `locked`: you never edit a total, you edit its inputs.

## Two rules that connect the axes

**Cascade** — correcting a field that feeds a computed total recalculates that total and clears its "provisional" flag. Endorsing a sum is void the moment an input changes.

**Audit trail** — every state change appends to `edit_history` (`who`, `when`, `old → new`, `note`). This is the CPA's legal cover and powers the "AI said X, human changed it to Y" display. As a side effect, it's a labeled dataset of when the AI was right or wrong.

## How it maps to the screens

- **Traceability** renders `provenance` — five evidence displays
- **Affordances** render `state` — six states, one visual grammar
- **Trustworthy AI** renders `confidence` + `edit_history`
- **Dashboard** aggregates `state` across returns to rank the queue

One well-designed object, rendered four ways.