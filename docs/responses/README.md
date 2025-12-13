# Metabase API Response Reference

Local reference for Metabase API response structures. Avoids needing to consult Metabase API docs when adding/removing fields from optimized responses.

## Models

- `card.json` - Saved questions/queries
- `collection.json` - Collections/folders
- `dashboard.json` - Dashboards with embedded cards
- `database.json` - Database connections
- `field.json` - Table fields/columns
- `table.json` - Database tables

## Usage

Reference these files when modifying optimization functions in `src/handlers/retrieve/` or `src/types/optimized.ts` to know what fields are available in raw Metabase responses.
