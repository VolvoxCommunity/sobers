import { Redirect } from 'expo-router';

/**
 * Redirects /program to /program/steps (default tab).
 */
export default function ProgramIndex() {
  return <Redirect href="/program/steps" />;
}
