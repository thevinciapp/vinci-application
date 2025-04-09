// vinci-application/eslint.config.js
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReactConfig,
  // Add Prettier config last to override formatting rules
  eslintConfigPrettier,
  {
    // Custom rules or overrides can go here
    rules: {
      // Example: Disable a specific rule if needed
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off"
    },
    settings: {
      react: {
        version: "detect", // Automatically detect the React version
      },
    },
  },
  {
    ignores: [
      "node_modules/",
      "out/",
      "dist/",
      "electron.vite.config.ts", // Often uses different module systems
      ".eslintrc.cjs", // Ignore old config if present
      "postcss.config.js",
      "tailwind.config.js", // Build/config files
    ],
  },
];