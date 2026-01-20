import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockHome } = vi.hoisted(() => ({
  mockHome: '/Users/alice',
}));

vi.mock('os', () => ({
  homedir: () => mockHome,
}));

import { isValidExportPath } from '../../src/utils/fileUtils.js';

describe('isValidExportPath', () => {
  let originalNodeEnv: string | undefined;
  let originalVitest: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalVitest = process.env.VITEST;
    process.env.NODE_ENV = 'production';
    delete process.env.VITEST;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalVitest === undefined) {
      delete process.env.VITEST;
    } else {
      process.env.VITEST = originalVitest;
    }
  });

  it('accepts the home directory itself', () => {
    expect(isValidExportPath('/Users/alice')).toBe(true);
  });

  it('accepts paths within the home directory', () => {
    expect(isValidExportPath('/Users/alice/exports')).toBe(true);
  });

  it('rejects paths that only share the home prefix', () => {
    expect(isValidExportPath('/Users/alice_backup/exports')).toBe(false);
  });

  it('rejects blocked sensitive directories within home', () => {
    expect(isValidExportPath('/Users/alice/.ssh/keys')).toBe(false);
  });
});
