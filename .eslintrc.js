module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: ['airbnb-base', 'prettier'],
  globals: {},
  parserOptions: {
    ecmaVersion: 2019,
  },
  rules: {
    'no-console': 0,
    'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
    'no-await-in-loop': 0,
    'no-cond-assign': 0,
    'prefer-destructuring': 0,
    'func-names': 0,
  },
};
