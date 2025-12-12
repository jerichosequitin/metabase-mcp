import { describe, it, expect } from 'vitest';
import { createErrorFromHttpResponse } from '../../src/utils/errorFactory.js';

describe('API Error Resource Extraction', () => {
  describe('Resource type detection', () => {
    it('should create database not found error for database 404', () => {
      const error = createErrorFromHttpResponse(
        404,
        { message: 'Database not found' },
        'API request to /api/database/999',
        'database',
        999
      );
      expect(error.message).toBe('database not found: 999');
    });

    it('should create card not found error for card 404', () => {
      const error = createErrorFromHttpResponse(
        404,
        { message: 'Card not found' },
        'API request to /api/card/123',
        'card',
        123
      );
      expect(error.message).toBe('card not found: 123');
    });

    it('should create dashboard not found error for dashboard 404', () => {
      const error = createErrorFromHttpResponse(
        404,
        { message: 'Dashboard not found' },
        'API request to /api/dashboard/456',
        'dashboard',
        456
      );
      expect(error.message).toBe('dashboard not found: 456');
    });

    it('should fallback to generic error when resource type is not provided', () => {
      const error = createErrorFromHttpResponse(
        404,
        { message: 'Not found' },
        'API request to /api/unknown/endpoint'
      );
      expect(error.message).toBe('Metabase item not found');
    });
  });

  describe('Error message patterns', () => {
    it('should differentiate database not found from database connection errors', () => {
      // Database not found (404)
      const notFoundError = createErrorFromHttpResponse(
        404,
        { message: 'Database with id 999 not found' },
        'API request to /api/database/999',
        'database',
        999
      );
      expect(notFoundError.message).toBe('database not found: 999');

      // Database connection error (500 with database-related message)
      const connectionError = createErrorFromHttpResponse(
        500,
        { message: 'Database connection timeout' },
        'API request to /api/database/1/tables'
      );
      expect(connectionError.message).toBe('Query execution failed: Database connection timeout');
    });
  });
});
