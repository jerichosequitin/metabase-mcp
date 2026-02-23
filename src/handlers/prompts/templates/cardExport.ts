/**
 * Template for card export prompt
 */
export function getCardExportTemplate(
  cardId: string,
  fileType: string,
  cardDetails: string,
  databaseInfo: string,
  parametersInfo: string,
  queryInfo: string,
  userFiltersText: string
): string {
  return `Export the Metabase card with ID ${cardId} to ${fileType.toUpperCase()} format. Use the card details and filter requirements provided below. Work silently through the export process and confirm when the file is saved.

${cardDetails}
${databaseInfo}
${parametersInfo}
${queryInfo}
${userFiltersText}

**EXPORT INSTRUCTIONS:**

You must export this card data to a file. Follow this simplified, reliable process:

1. **Parse filters** (if provided) against the card's available parameters. Convert natural language values to proper formats (dates to ISO format, numbers to integers/floats, text to strings).

2. **Try card export first** using the 'export' tool in card mode with card_id=${cardId} and format="${fileType}". If filters were identified, include them as card_parameters. For dimension targets, use array values (e.g., \`"value": ["converted-value"]\`).

3. **Use SQL fallback** if card export fails OR returns 0 results:
   - Extract the native SQL query from the card details above
   - Replace template variables with hardcoded filter values
   - **If SQL also returns 0 results, debug the query STRUCTURE (not the filters):**
     * Remove CTEs and subqueries - use the main query structure directly
     * Fix WHERE clause syntax - but KEEP ALL requested filters
     * Check JOIN conditions that might be excluding data
     * Fix column references (e.g., use correct table aliases)
   - **If simplified SQL still returns 0 results, validate individual filters:**
     * Test each filter condition separately: "SELECT 1 FROM table WHERE individual_filter LIMIT 1"
     * Only accept empty results if individual filter validation confirms the specific values don't exist
   - **NEVER remove user-requested filters** - they are requirements, not suggestions
   - Export using 'export' tool in SQL mode with the debugged query

**IMPORTANT:**
- Do not explain your process or describe steps you're taking. Simply export the card and confirm the file location.
- **ALL user filters MUST be included in the final export** - do not remove filters to get results.
- Only accept empty results after verifying individual filter conditions exist in the database.
- Confirm the file has been saved and provide the file path when complete.

Export the card now.`;
}
