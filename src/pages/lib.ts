export const resolve_url = (url: string) => {
  url = url.trim();
  if (url.includes("/release")) {
    url = url.split("/release")[0];
  }
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
}
