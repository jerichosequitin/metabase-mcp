import { describe, expect, it } from 'vitest';
import type { CallToolRequest } from '@modelcontextprotocol/server';
import { normalizeToolArguments } from '../../src/utils/toolArguments.js';

function createRequest(name: string, args: Record<string, unknown>): CallToolRequest {
  return {
    method: 'tools/call',
    params: {
      name,
      arguments: args,
    },
  };
}

describe('normalizeToolArguments', () => {
  it.each([
    ['search', { max_results: '20', database_id: '3' }, { max_results: 20, database_id: 3 }],
    ['retrieve', { table_offset: '0', table_limit: '50' }, { table_offset: 0, table_limit: 50 }],
    ['list', { offset: '10', limit: '100' }, { offset: 10, limit: 100 }],
    ['execute', { database_id: '4', row_limit: '250' }, { database_id: 4, row_limit: 250 }],
    ['export', { card_id: '12' }, { card_id: 12 }],
  ])('normalizes numeric strings for %s', (name, args, expected) => {
    const request = createRequest(name, args);

    const normalizedRequest = normalizeToolArguments(request);

    expect(normalizedRequest.params.arguments).toEqual(expected);
    expect(request.params.arguments).toEqual(args);
  });

  it.each(['search', 'retrieve'])('normalizes numeric strings in %s ids arrays', name => {
    const normalizedRequest = normalizeToolArguments(createRequest(name, { ids: ['1', 2, '003'] }));

    expect(normalizedRequest.params.arguments?.ids).toEqual([1, 2, 3]);
  });

  it('leaves native numbers and unrelated arguments unchanged', () => {
    const request = createRequest('execute', {
      card_id: 42,
      row_limit: 100,
      card_parameters: [{ value: '7' }],
    });

    expect(normalizeToolArguments(request).params.arguments).toEqual(request.params.arguments);
  });

  it.each([
    ['', 'database_id'],
    ['   ', 'database_id'],
    ['12px', 'database_id'],
    ['1.5', 'database_id'],
    ['1e3', 'database_id'],
    [null, 'database_id'],
    [true, 'database_id'],
  ])('rejects ambiguous scalar value %j', (value, field) => {
    expect(() => normalizeToolArguments(createRequest('execute', { [field]: value }))).toThrow(
      `${field} must be an integer`
    );
  });

  it('rejects unsafe integer strings', () => {
    expect(() =>
      normalizeToolArguments(
        createRequest('execute', { database_id: `${Number.MAX_SAFE_INTEGER}0` })
      )
    ).toThrow('database_id must be a safe integer');
  });

  it('reports the array element path for invalid IDs', () => {
    expect(() =>
      normalizeToolArguments(createRequest('retrieve', { ids: ['1', 'invalid'] }))
    ).toThrow('ids[1] must be an integer');
  });

  it('rejects non-array IDs', () => {
    expect(() => normalizeToolArguments(createRequest('search', { ids: '1' }))).toThrow(
      'ids must be an array of integers'
    );
  });

  it('does not normalize unknown tools', () => {
    const request = createRequest('unknown', { database_id: '1' });

    expect(normalizeToolArguments(request)).toBe(request);
  });
});
