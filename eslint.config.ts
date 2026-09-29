import js from '@eslint/js'
import vueI18n from '@intlify/eslint-plugin-vue-i18n'
import checkFile from 'eslint-plugin-check-file'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

const layer = (patterns: string[], message: string) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }],
})

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['app/**/*.{ts,vue}', 'shared/**/*.ts', 'server/**/*.ts', 'tests/**/*.ts'],
    plugins: {
      '@intlify/vue-i18n': vueI18n,
      'check-file': checkFile,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    settings: {
      'vue-i18n': { localeDir: './i18n/locales/*.json', messageSyntaxVersion: '^11.0.0' },
    },
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
    rules: {
      'no-undef': 'off',

      // Vue
      'vue/multi-word-component-names': 'off',
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/define-emits-declaration': ['error', 'type-based'],
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/no-unused-refs': 'error',
      'vue/require-default-prop': 'off',

      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/array-type': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'variable', modifiers: ['destructured'], format: null },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'objectLiteralProperty', format: null },
        { selector: 'typeProperty', format: null },
        { selector: 'objectLiteralMethod', format: null },
      ],

      // File naming
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,json}': 'KEBAB_CASE', 'app/{components,views}/**/*.vue': 'PASCAL_CASE' },
        { ignoreMiddleExtensions: true },
      ],

      // Imports
      'simple-import-sort/imports': ['error', { groups: [['^']] }],
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',

      // i18n — every user-visible string comes from i18n/locales/*.json
      '@intlify/vue-i18n/no-raw-text': ['error', { ignorePattern: '^[-–—·×✓+/:.,!?()\\s\\d%@→←…]+$' }],
      '@intlify/vue-i18n/no-missing-keys': 'error',
    },
  },

  // Architecture boundaries
  {
    files: ['app/components/ui/**/*.{ts,vue}'],
    rules: layer(['~/stores/*', '~/api/*', '~/composables/*', '@/stores/*', '@/api/*', '@/composables/*'], 'components/ui is presentational: props in, events out.'),
  },
  {
    files: ['app/components/**/*.vue', 'app/views/**/*.vue', 'app/layouts/**/*.vue'],
    ignores: ['app/components/ui/**'],
    rules: layer(['~/api/*', '@/api/*'], 'Go through a composable or store, never api/ directly.'),
  },
  {
    files: ['**/index.ts'],
    ignores: ['node_modules/**', '.nuxt/**', 'supabase/**'],
    rules: { 'no-restricted-syntax': ['error', { selector: 'ExportAllDeclaration', message: 'No barrel exports — import the file directly.' }] },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', document: 'readonly' } },
  },
  {
    ignores: ['app/types/database.ts', '.nuxt/', '.output/', 'node_modules/', 'coverage/', 'playwright-report/', 'test-results/', 'supabase/functions/**', 'supabase/templates/**'],
  },
)
