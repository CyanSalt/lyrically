import config from '@cyansalt/eslint-config'

export default config({
  configs: [
    {
      languageOptions: {
        parserOptions: {
          project: './tsconfig.tools.json',
          extraFileExtensions: ['.vue'],
        },
        globals: {
          worldBridge: 'readonly',
        },
      },
      rules: {
        'vue/no-undef-components': 'error',
        'vue/no-undef-properties': 'error',
      },
    },
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
})
