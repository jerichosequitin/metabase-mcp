# Metabase API Response Reference

Local reference for Metabase API response structures. Avoids needing to consult Metabase API docs when adding/removing fields from optimized responses.

## Models

- `card.json` - Saved questions/queries
- `collection.json` - Collections/folders
- `dashboard.json` - Dashboards with embedded cards
- `database.json` - Database connections
- `field.json` - Table fields/columns
- `table.json` - Database tables
- `execute_dashboard.json` - Consolidated dashboard execution output with per-card results

## Usage

Reference these files when modifying optimization functions in `src/handlers/retrieve/` or `src/types/optimized.ts` to know what fields are available in raw Metabase responses.

## Execute Dashboard Response Optimization Notes

`execute_dashboard.json` reflects a normalized aggregate response designed for LLM consumption:

- Returns only executable dashcard outputs (non-executable items are summarized in `skipped[]`).
- Uses per-card row limits to cap payload size (`applied_limit`, `row_count`, `original_row_count`).
- Collapses per-card failures into concise `errors[]` entries instead of returning full raw error payloads.

This structure trades some low-level raw API fidelity for significantly more predictable token usage in multi-card dashboard explorations.
