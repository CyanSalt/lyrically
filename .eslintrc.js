module.exports = {
  root: true,
  extends: [
    '@cyansalt/preset',
  ],
  parserOptions: {
    project: './tsconfig.tools.json',
  },
  globals: {
    worldBridge: 'readonly',
  },
  rules: {
    'vue/no-undef-components': 'error',
    'vue/no-undef-properties': 'error',
  },
  overrides: [
    {
      files: [
        '**/main/**/*.ts',
        '**/preload/**/*.ts',
      ],
      rules: {
        'no-restricted-imports': ['error', {
          paths: ['vue'],
        }],
        'vue/prefer-import-from-vue': 'off',
      },
    },
  ],
}
