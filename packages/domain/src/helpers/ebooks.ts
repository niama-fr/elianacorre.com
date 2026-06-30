// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const MAX_SIZE = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = ["application/pdf"];

// SIZE ==----------------------------------------------------------------------------------------------------------------------------------
export const formatSize = (size: number) => {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} Ko`;
  return `${(size / 1024 / 1024).toFixed(2)} Mo`;
};
