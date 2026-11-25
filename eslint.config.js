import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['dist/']),
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['src/**/*.jsx'],
    extends: [reactRefresh.configs.vite],
    // ESLint's core rule does not count JSX tags as references to their components.
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]' }] },
  },
])
