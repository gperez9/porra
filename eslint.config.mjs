import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".tools/**",
      "coverage/**",
      "dist/**"
    ]
  },
  ...nextVitals,
  ...nextTypescript
];

export default config;
