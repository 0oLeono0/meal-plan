import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules/**', 'dist/**', '.tmp/**', '.agents/**', '.planning/**', 'reference/**'] },
  { ...js.configs.recommended, files: ['**/*.js'] },
  ...tseslint.configs.recommended.map(config => ({ ...config, files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', '*.config.ts'] })),
];
