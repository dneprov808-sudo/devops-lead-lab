# Assessment v12
Local review decisions only. Operator must personally compare the answer, rubric and evidence, independent of the student/AI. The CLI cannot authenticate the reviewer or prove independence; this is explicit human attestation, not canonical competency approval. No HTTP decision route.
1. Save an attempt or mock, import review_proposal (as v11).
2. Inspect: python assessment_v12.py inspect PROPOSAL_UUID (private output).
3. Decide: python assessment_v12.py decide PROPOSAL_UUID BINDING_SHA accept --operator 'reviewer name' --review-ref 'independent review reference' --confirm-independent-review
4. Report: python assessment_v12.py report. Same binding retry is idempotent; conflicting decision blocked. Conflicting accepted scores for same attempt/question excluded, manual reconciliation pending.
Entry/Lead/full examination status requires profile coverage, complete independent local decisions and proposed thresholds (all >=2, average >=3). This is a candidate result, never a canonical grade. Orchestrator must separately verify and approve. Existing JSON exports contain events only, not decisions; binary SQLite backup preserves decisions. Do not import a decision database from an untrusted source.
