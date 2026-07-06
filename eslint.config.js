import gts from 'gts';

export default [
  // Spread the standard Google TypeScript Style rules
  ...gts,

  // Global ignore pathways (Replaces eslint.ignores.js)
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'vite.config.ts',
      'eslint.config.js'
    ]
  },

  // Custom project rule overrides
  {
    files: ['**/*.ts'],
    rules: {
      // If you want to customize any Google rules later, they go here
    }
  }
];