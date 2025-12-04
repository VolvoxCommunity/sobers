/**
 * Mock for expo/virtual/* modules
 * Prevents ESM parsing errors in Jest
 */
module.exports = {
  env: process.env,
};
