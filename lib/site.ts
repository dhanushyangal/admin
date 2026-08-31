/** Public marketing site (hydrilla.ai), not the admin app. */
export function publicSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://hydrilla.ai").replace(/\/+$/, "");
}

export function publicBlogIndexUrl(): string {
  return `${publicSiteUrl()}/blog`;
}

export function publicBlogPostUrl(slug: string): string {
  const clean = slug.trim().replace(/^\/+|\/+$/g, "");
  return `${publicSiteUrl()}/blog/${clean}`;
}
