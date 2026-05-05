// .eslintrc.js — at the root
module.exports = {
root: true,
parser: '@typescript-eslint/parser',
plugins: ['@typescript-eslint'],
extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
],
parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
},
rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
    ],
    '@typescript-eslint/consistent-type-imports': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
},
overrides: [
    {
        files: ['*.tsx', '*.jsx'],
        extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
        rules: { 'react/react-in-jsx-scope': 'off' },
    },
],
};
/**
 *  no-console: warn: Accidental console.log(user.token) in production code is a
security issue — tokens appear in server logs. The ESLint rule enforces that console.log
is intentional, not accidental.
 */