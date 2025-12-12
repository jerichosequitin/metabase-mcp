/**
 * Template for card execution prompt
 */
export function getCardExecutionTemplate(
  cardId: string,
  cardDetails: string,
  databaseInfo: string,
  parametersInfo: string,
  queryInfo: string,
  userFiltersText: string
): string {
  return `Execute the Metabase card with ID ${cardId}. Use the card details and filter requirements provided below. Work silently through the execution process and only present the final results.

${cardDetails}
${databaseInfo}
${parametersInfo}
${queryInfo}
${userFiltersText}

**EXECUTION INSTRUCTIONS:**

You must execute this card and return the data. If filter requirements are provided, apply them to the card parameters. Follow this process:

1. **Parse filters** (if provided) against the card's available parameters. Match filter requirements to parameter names, slugs, or purposes. Convert natural language values to proper formats (dates to ISO format, numbers to integers/floats, text to strings).

2. **Execute the card** using the 'execute' tool in card mode with card_id=${cardId}. If filters were identified, include them as card_parameters in this format:
   \`\`\`json
   [{
     "id": "parameter-uuid",
     "slug": "parameter-slug",
     "target": ["dimension", ["template-tag", "parameter-name"]],
     "type": "parameter-type",
     "value": "converted-value"
   }]
   \`\`\`
   Start with row_limit=100.

3. **Handle failures** by retrying up to 3 times with different parameter value formats or reduced row limits if needed.

4. **Use SQL fallback** if card execution fails completely OR returns 0 results:
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
   - Execute using 'execute' tool in SQL mode with the debugged query

**IMPORTANT:**
- Do not explain your process or describe steps you're taking. Simply execute the card and present the results.
- Only mention execution method or applied filters if there were issues or if using the SQL fallback approach.
- **Display only the first 10 rows** of results to keep the conversation manageable.
- If there are more than 10 rows, mention the total count and suggest the user can export the full dataset if needed.
- **ALL user filters MUST be included in the final execution** - do not remove filters to get results.
- Only accept empty results after verifying individual filter conditions exist in the database.

Execute the card now.`;
}
