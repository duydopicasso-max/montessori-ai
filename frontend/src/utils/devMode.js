/**
 * devMode.js
 * Utility to strictly detect local development mode.
 * Ensures mock/bypass logic only runs on localhost/127.0.0.1.
 */

export const isLocalDevMode =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
