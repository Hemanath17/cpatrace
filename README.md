# CPA Trace

**Every number, back to its source.**

CPA Trace is an AI-assisted tax review console. An AI reads a client's documents and fills in their return; CPA Trace lets the accountant verify every figure in seconds — trace it to the exact document it came from, see how confident the AI was, get a second opinion, and correct it with a full audit trail.

**Live demo:** https://cpatrace-app.vercel.app
**Guest access:** open the demo and choose *Continue as guest (Camila)*.

---

## The problem

Firms are adopting AI to extract data from tax documents and populate returns. The extraction is fast — but the accountant who signs the return is personally liable for every number on it, and an AI that is 95% right is still wrong somewhere. That leaves the reviewer with a bad trade: trust the AI blindly, or re-check everything by hand and erase the time the automation just saved.

CPA Trace exists to make a third option real: **verify the AI faster than redoing the work.** It directs the reviewer's attention to the figures that actually need judgment, makes the safe ones confirmable in one click, and keeps a defensible record of every decision.

## What it does

- **Traceability.** Every figure links back to its origin. Click a number and the source document opens beside it with the exact region highlighted — or, for calculated figures, the formula and its inputs.
- **Trust, made actionable.** Confidence is shown where the AI actually made a judgment, and expressed as guidance ("verify this") rather than raw scores. Low-confidence reads, year-over-year anomalies, and conflicting documents are surfaced, not buried.
- **A second opinion on demand.** Any field can be sent to an independent model (Gemini) for a reasoned agree / disagree / uncertain verdict. It is advisory — the reviewer decides.
- **Correction with a memory.** Every verification and correction is recorded — who, when, old value, new value, and why. Correcting an input automatically recomputes the totals that depend on it.
- **A queue that ranks itself.** The dashboard answers "what should I work on right now?" — ordering returns by deadline, flagged work, and blockers, and sinking returns that are merely waiting on the client.
- **Status everyone reads the same way.** A single derived status drives both a detailed reviewer view and a plain-language client view, so "under review" means the same thing to everyone.
- **Contextual collaboration.** Questions live on the field they're about, with a clear line between internal firm notes and client-visible messages, and a visible owner for the next action.

## Architecture

A decoupled full-stack app:

- **Frontend** — React + Vite + Tailwind, deployed on Vercel.
- **Backend** — FastAPI + SQLModel (SQLite), deployed on Render. Owns the review state machine, the recompute cascade, and an append-only audit trail.
- **Validation** — Pydantic schemas enforce the data contract at every boundary: confidence must be a probability, an extracted value must carry a real source, a computed value must list its inputs, and human-provided answers may not carry a fabricated confidence. Traceability is a guaranteed invariant, not a convention.
- **Second opinion** — proxied through the backend so the model key never reaches the browser.

## What's real vs. simulated

**Simulated — by design:**
- **Document extraction.** There is no OCR. Source documents are rendered mocks, and the "extracted" values, confidence scores, conflict picks, and anomaly flags are authored data. This data is internally consistent — totals sum, the SALT cap applies, the capital-loss limit binds — so the review workflow behaves exactly as it would on real output. Swapping in a real document model changes nothing downstream; it produces the same validated shape the interface already consumes.
- **The upload flow.** Uploading a document triggers a real backend call that returns the prepared return, standing in for an extraction pass.
- **Authentication.** Guest login enters as a fixed reviewer; there is no account system.

**Real:**
- The full review **state machine** — verify, correct, resolve conflict, approve, reject — with only legal transitions permitted.
- The **cascade** — correcting an input recomputes every dependent total server-side and voids the total's prior sign-off.
- The **sign-off rule** — a return cannot be marked ready while any field is unreviewed.
- **Second-reviewer routing** — a correction above a materiality threshold is automatically sent for approval.
- The **audit trail** — append-only, persisted, per field.
- The **second opinion** — a live model call, with a graceful fallback if the model is unavailable so the workflow never stalls.
- The **dashboard ranking** and the **derived status** logic.

## Where the AI engineering lives

The extraction model is stubbed, but the engineering that matters for trustworthy AI is the surrounding layer:

- **Confidence policy** — thresholds that route low-confidence reads to review; scores never shown without a reason.
- **Confidence inheritance** — a computed total inherits the *minimum* confidence of its inputs, because one weak input poisons the result.
- **Suppressed confidence** — no score is shown where no model judged (client answers, carryforwards); a fabricated score would devalue every real one.
- **Autonomy boundaries** — on a document conflict the AI recommends and explains, but never resolves; a human does.
- **The audit trail as an evaluation set** — every human correction is a labeled example. Corrections concentrated at low confidence indicate a calibrated model; corrections at high confidence are the signal that it is not.

There is no ground truth to measure extraction against — in this domain the document is the source of truth and errors surface only when a liable human disagrees. The system is designed around that reality: the human's decision is the label, generated one review at a time.

## How success would be measured

- **Median time-to-decision per field** — verifying should be measurably faster than manual entry.
- **Correction rate on high-confidence fields** — should be near zero; anything else means miscalibration.
- **Flag-to-correction rate** — flags should usually mean something, or reviewers learn to ignore them.
- **Manual-lookup rate** — how often a reviewer leaves the app to open a source document by hand.

The audit trail generates the data for all four.

## Running locally

Frontend:
```bash
npm install
npm run dev
```

Backend:
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Set `VITE_API_URL` to the backend URL (defaults to `http://localhost:8000`). The second-opinion feature reads `GEMINI_API_KEY` from the backend environment; without it, the endpoint returns a deterministic fallback.

## A suggested path through the demo

1. On the dashboard, open **Maria & Carlos Martinez** — the fully wired return.
2. Follow the status tracker at the top, and toggle the reviewer / client views of the same status.
3. Click any field to trace it to its source document.
4. Open **Interest — Chase Bank** — two documents disagree; resolve it and watch the interest total recompute.
5. Open **Real estate taxes** — a low-confidence read from a poor scan; use **AI check** for a second opinion, and see the discussion thread attached to the field.
6. Try to mark the return ready to file — the sign-off rule blocks it until every field is reviewed.