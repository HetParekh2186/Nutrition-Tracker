const config = {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "no-em-dash": ({ raw }) => [
          !raw.includes("—"),
          "commit messages must not contain em dashes",
        ],
      },
    },
  ],
  rules: {
    "header-max-length": [2, "always", 72],
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "test", "docs", "style", "chore", "perf"],
    ],
    "no-em-dash": [2, "always"],
  },
};

export default config;
