module.exports = {
    root: true,
    env: {
        browser: true,
        node: true
    },
    plugins: ["@typescript-eslint", "jest", "react", "react-hooks"],
    extends: [
        "eslint:recommended",
        "prettier",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:jest/recommended",
        "plugin:react/recommended",
        "plugin:prettier/recommended",
        "plugin:react/jsx-runtime"
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaFeatures: {
          jsx: true,
          tsx: true
        },
        ecmaVersion: 8,
        project: [
          './tsconfig.json'
        ]
    },
    rules: {
        "no-unused-vars": 1,
        "only-arrow-functions": 0,
        "@typescript-eslint/no-var-requires": 1
    }
};
