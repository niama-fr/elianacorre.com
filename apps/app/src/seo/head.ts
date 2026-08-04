export const noindexHead = (title: string) => ({
  meta: [{ title }, { content: "noindex, nofollow, noarchive", name: "robots" }, { content: "no-referrer", name: "referrer" }],
});
