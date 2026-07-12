export const getLink = ({ base, path, token }: { base: string; path: string; token: string }) => {
  const link = new URL(path, base);
  link.searchParams.set("token", token);
  return link.href;
};
