# Cross-cell Change Protocol

Any change touching more than one micro-cell must follow this protocol.

## Definition of Breaking Change
A change is breaking if it:
- Removes or renames an HTTP endpoint without a versioned replacement.
- Changes required request/response fields in a documented contract.
- Alters SKU identifiers or entitlement semantics.
- Modifies data schema without a backward-compatible migration.

## Cross-cell Workflow
1. Draft a change proposal in `docs/microchip/changes/CHG-<id>.md`.
2. Tag the impacted micro-cells and summarize contract deltas.
3. Obtain approval from `AGENT_SYSTEM`.
4. Have `AGENT_RELEASE` run end-to-end validation before merge.

## Required Checks
- Contract check: `python scripts/contract_check.py`
- Lint (Python): `ruff check backend tests backend/tests scripts`
- Type-check (contracts + scripts): `mypy --config-file mypy.ini`
- Unit tests: `pytest`
- Smoke test: `python scripts/smoke_test.py`

## Change Proposal Template
```
# CHG-<id> – <title>

## Why
- Explain the motivation and user impact.

## Impacted Micro-cells
- CELL_...
- CELL_...

## Contract Changes
- Before:
- After:

## Migration Plan
- Steps for rolling out safely.

## Rollback Plan
- Steps to revert safely.
```
