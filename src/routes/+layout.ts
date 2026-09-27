// Fully static single-page app: everything renders on the client, nothing on a server.
// See docs/adr/0004-static-client-side-per-device-saves.md
export const ssr = false;
export const prerender = false;
