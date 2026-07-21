import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist', 'node_modules', '*.cjs', '*.js']
  },
  firebaseRulesPlugin.configs['flat/recommended']
]
