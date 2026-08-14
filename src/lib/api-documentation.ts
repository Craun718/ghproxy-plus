export function resolveApiDocumentationContent(
  content: string,
  origin: string
): string {
  return content.replace(/https:\/\/\[host\]/g, origin);
}
