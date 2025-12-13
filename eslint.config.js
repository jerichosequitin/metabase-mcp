import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['warn', { allow: ['error'] }],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'comma-dangle': 'off',
      semi: ['error', 'always'],
      quotes: ['error', 'single', { allowTemplateLiterals: true, avoidEscape: true }],
      'no-prototype-builtins': 'off',
    },
  },
  {
    ignores: [
      'build/',
      'dist/',
      'coverage/',
      'node_modules/',
      'scripts/',
      '*.cjs',
      'tests/data/',
      '*.js.map',
      '*.d.ts.map',
      '.env',
      '.env.*',
      '*.js',
    ],
  }
);
