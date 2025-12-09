/**
 * Mock for expo-router/head module to prevent ESM parsing errors in Jest tests.
 * This provides a simple passthrough component that renders children.
 */

const React = require('react');

function Head({ children }) {
  return React.createElement(React.Fragment, null, children);
}

module.exports = Head;
module.exports.default = Head;
