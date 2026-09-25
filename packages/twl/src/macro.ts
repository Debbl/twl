/**
 * The entry a compiled build recognizes.
 *
 * Importing `cls` from here is what tells the twl compiler to fold the
 * template into a plain string at build time. Nothing here is a build-only
 * stub: without the compiler configured the real runtime runs instead, so the
 * code works either way and only the cost differs.
 */
export { cls } from './cls'
export { tw } from './tw'
