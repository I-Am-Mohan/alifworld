import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,

  {
    rules: {
      "prefer-const": "error",
      "no-var": "error",

      "no-console": [
        "warn",
        {
          allow: ["warn", "error", "info"],
        },
      ],

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  globalIgnores([
    "node_modules/",
    ".next/",
    "dist/",
    "out/",
    "build/",
    "coverage/",
    "UI References/",
  ]),
]);