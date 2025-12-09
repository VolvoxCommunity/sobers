/**
 * Mock for expo-router/head module to prevent ESM parsing errors in Jest tests.
 * This provides a simple passthrough component that renders children.
 */

const React = require('react');

/**
 * Renders the provided children inside a React Fragment.
 * @param {object} props - Component props.
 * @param {import('react').ReactNode} props.children - Elements to render inside the fragment.
 * @returns {import('react').ReactElement} A React Fragment containing the given children.
 */
function Head({ children }) {
  return React.createElement(React.Fragment, null, children);
}

module.exports = Head;
module.exports.default = Head;
module.exports.__esModule = true;
