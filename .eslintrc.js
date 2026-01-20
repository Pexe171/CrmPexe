// .eslintrc.js
module.exports = {
  root: true,
  // This tells ESLint to load the config from the package `eslint-config-custom`
  // extends: ["custom"], // Removido para simplificar, usando config direta
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  ignorePatterns: ["node_modules/", "dist/", ".next/", "out/"],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint", "prettier"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
      ],
      rules: {
        "prettier/prettier": "error",
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        "@typescript-eslint/no-explicit-any": "warn",
      },
    },
  ],
};