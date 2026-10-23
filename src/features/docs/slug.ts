/** A slug from a title: lowercase letters, digits and hyphens. Empty when the title has none (for example, Bangla). */
export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}
