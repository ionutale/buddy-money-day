/**
 * Scenes that want to preview an outcome on the Goal banner set this (the
 * Shelf sets jar + held coins while the child is choosing). Null means
 * "show the real jar".
 */
export const banner = $state<{ preview: number | null }>({ preview: null });
