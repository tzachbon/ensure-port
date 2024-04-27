// pleb.config.mjs

/**
 * @type {import('pleb').PlebConfiguration}
 */
export default {
  pinnedPackages: [
    {
      name: 'eslint',
      reason: 'Version 9 does not support "@typescript-eslint/eslint-plugin"'
    }
  ],
};
