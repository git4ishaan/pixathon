declare module 'virtual:asset-list' {
  /** File names found in public/assets when the dev server or build started. */
  const files: readonly string[];
  export default files;
}
