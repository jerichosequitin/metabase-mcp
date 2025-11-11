# Metabase Response Optimization Reference

This directory contains standardized reference files that document the complete structure of raw Metabase API responses for each model type. These references guide optimization decisions to reduce token usage while preserving essential functionality.

## Purpose

When optimizing retrieve responses to reduce token usage, we need to:
1. **Know what fields exist** - Complete field inventory from raw responses
2. **Understand field usage** - Which fields are used by other MCP handlers
3. **Make informed decisions** - Keep essential fields, remove unused ones
4. **Reference lookup** - Quickly find available fields when needed

## File Structure

Each model has a standardized reference file: `{model}.json`

### Available Models
- **card.json** - Complete with optimization analysis (~90% token reduction)
- **dashboard.json** - Complete with optimization analysis (~85% token reduction)
- **table.json** - Complete with optimization analysis (~80% token reduction)
- **database.json** - Complete with optimization analysis (~75% token reduction)
- **collection.json** - Complete with optimization analysis (~15% token reduction)
- **field.json** - Complete with optimization analysis (~75% token reduction)

### Available Commands
- **query.json** - SQL query and card execution optimizations (~85-90% token reduction)

## Reference File Format

```json
{
  "model_type": "card",
  "description": "Complete card response structure with query and metadata",
  "token_analysis": {
    "estimated_raw_size": "~45,000-50,000 characters",
    "major_token_consumers": ["result_metadata array", "..."],
    "optimization_opportunities": ["Remove result_metadata", "..."],
    "estimated_savings": "~90% reduction (45,000 to ~4,000-5,000 characters)"
  },
  "essential_fields": ["id", "name", "database_id", "..."],
  "essential_nested_object_fields": ["dataset_query.native.query", "..."],
  "removable_fields": ["result_metadata", "visualization_settings", "..."],
  "raw_response_structure": {
    "field_name": "type_description",
    "nested_object": {
      "sub_field": "type_description"
    },
    "array_field": ["element_type_description"]
  },
  "flattened_fields": [
    "id",
    "nested_object.sub_field",
    "array_field[]",
    "array_field[].element_property"
  ],
  "optimization_notes": ["Explanation of optimization decisions", "..."]
}
```

## How to Use

### 1. For Optimization Analysis
When optimizing a model response:

1. **Check the reference file** for complete field inventory
2. **Review `essential_fields`** - these must be kept for MCP operations
3. **Review `removable_fields`** - these can be safely removed
4. **Use `flattened_fields`** for quick field lookup
5. **Check `raw_response_structure`** for field types and structure

### 2. For Adding Missing Fields
If you need a field that was removed:

1. **Find the field** in `flattened_fields` list
2. **Check the structure** in `raw_response_structure`
3. **Add to optimization function** in `src/handlers/retrieve.ts`
4. **Update `essential_fields`** list in reference file

### 3. For Understanding Field Types
Use `raw_response_structure` to understand:
- **Field data types**: `"string"`, `"number"`, `"boolean"`, `"array"`, `"object"`
- **Nullable fields**: `"string|null"`, `"number|null"`
- **Array contents**: `["element_type"]` shows array element structure
- **Complex objects**: Nested structure with sub-properties

## Optimization Guidelines

### Essential Fields (Always Keep)
- **Identifiers**: `id`, `database_id`, `table_id`, `card_id`, etc.
- **Core data**: `name`, `description`, `query`, `engine`, etc.
- **Relationships**: Foreign keys, collection references
- **Permissions**: `can_write`, `archived`, `active`, etc.
- **Execution data**: SQL queries, parameters, template tags
- **Analytics**: `view_count` (preserved for future use)

### Safe to Remove
- **Heavy metadata**: `result_metadata`, `fingerprint` data
- **Statistics**: Detailed fingerprint statistics (min, max, quartiles)
- **UI settings**: `visualization_settings`, `display` preferences
- **Caching**: `cache_ttl`, `cache_invalidated_at`
- **Internal fields**: `entity_id`, `metabase_version`, sync statuses
- **Embedding**: `embedding_params`, `enable_embedding`
- **Publishing**: `made_public_by_id`, `public_uuid`

### Investigate Before Removing
- **Parameters**: May be needed for query execution
- **Creator info**: Keep minimal identification fields only
- **Collection info**: Keep minimal identification fields only
- **Database features**: Large arrays that may not be essential

## Token Savings Achieved

Current optimizations:
- **Cards**: ~90% reduction (45,000+ → 4,000-5,000 chars)
- **Dashboards**: ~85% reduction (50,000+ → 7,500 chars)
- **Tables**: ~80% reduction (40,000+ → 8,000 chars)
- **Databases**: ~75% reduction (25,000+ → 6,000-7,500 chars)
- **Collections**: ~15% reduction (2,500+ → 2,000 chars)
- **Fields**: ~75% reduction (15,000+ → 3,000-4,000 chars)
- **Execute (SQL)**: ~85-90% reduction (25,000-35,000+ → 2,000-3,000 chars)
- **Execute (Card)**: Client-side row limiting prevents overwhelming responses
- **Bulk requests**: Savings multiply by item count

## Implementation

Optimizations are implemented in:
- **Interface definitions**: `src/optimized-types.ts`
- **Optimization functions**: `src/handlers/retrieve.ts`
- **Type guards**: `src/optimized-types.ts`

Each optimization function:
1. Creates base optimized object with required fields
2. Conditionally adds optional fields only if they exist
3. Simplifies nested objects (creator, collection, db)
4. Removes heavy arrays (result_metadata, fingerprints)
5. Preserves essential data for MCP operations

## Maintenance

1. **Update references** when Metabase API changes
2. **Review optimizations** periodically for new use cases
3. **Add new models** as they're supported (collection, field)
4. **Keep notes** on why fields were kept/removed
5. **Test optimizations** don't break execute, export_query operations

## Example Usage

```typescript
// Finding a field in reference
// Check: docs/responses/card.json
// Look in: flattened_fields array
// Find: "dataset_query.native.query"

// Adding to optimization function
if (card.dataset_query?.native?.query) {
  optimized.dataset_query = {
    native: {
      query: card.dataset_query.native.query,
      template_tags: card.dataset_query.native.template_tags
    }
  };
}
```

This system ensures aggressive optimization while maintaining the ability to easily restore any field if needed for future MCP operations.
