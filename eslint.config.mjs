import plugin from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';

const eslintConfig = [
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/generated/**',
      '**/node_modules/**',
      '**/.nx/**',
      '**/coverage/**',
      '**/prisma/seed.ts',
    ],
  },
  {
    plugins: {
      '@nx': plugin,
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: ['./generated/', '../generated/', '../../generated/'],
          depConstraints: [
            {
              sourceTag: 'scope:sample',
              onlyDependOnLibsWithTags: ['scope:sample', 'scope:shared'],
            },
            {
              sourceTag: 'scope:baby-bot',
              onlyDependOnLibsWithTags: ['scope:baby-bot', 'scope:shared'],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:data-access',
                'type:util',
              ],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:data-access', 'type:util'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default eslintConfig;
