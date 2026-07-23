# CPA Trace

Review console for AI-prepared tax returns. Every AI-filled number carries provenance — click a figure to see the exact spot on the source document it came from, with confidence, flags, and a full edit history.

## Run

```bash
npm install
npm run dev
```

## Known simplifications

- **Persistence is simulated.** Refresh resets in-memory review state.
- **Same-user approval.** Dana can approve her own large corrections. Real firms require a different second reviewer; a second identity is out of scope for this demo.
