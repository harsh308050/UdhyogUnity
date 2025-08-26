import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  // App source (browser)
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // Allow browser globals and a readonly 'process' for code that still references it
      globals: { ...globals.browser, process: 'readonly' },
      parserOptions: { ecmaVersion: 'latest', ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.3' } },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      // Pragmatic relaxations for this project
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react/no-unknown-property': ['warn', { ignore: ['playsInline'] }],
      'no-unused-vars': [
        'warn',
        { args: 'none', ignoreRestSiblings: true, varsIgnorePattern: '^React$' },
      ],
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Node environment files (Vite config, etc.)
  {
    files: ['vite.config.js', '**/*.config.{js,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
]
