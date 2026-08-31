export type BlogPostStatus = "draft" | "published";

export type AdminBlogPost = {
  id: string;
  title: string;
  headline: string | null;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string;
  author: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlogPostInput = {
  title: string;
  headline?: string | null;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  category: string;
  author: string;
  status: BlogPostStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImage?: string | null;
};

function backendBase(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL!.replace(/\/+$/, "");
}

async function authHeaders(getToken: () => Promise<string | null>): Promise<HeadersInit> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error || fallback;
}

function unreachableMessage(): string {
  return `Cannot reach backend at ${backendBase()}. Is the API running?`;
}

export async function fetchBlogPosts(
  getToken: () => Promise<string | null>,
  opts?: { search?: string; status?: string; category?: string; page?: number }
): Promise<{ posts: AdminBlogPost[]; total: number; totalPages: number }> {
  const params = new URLSearchParams();
  if (opts?.search) params.set("search", opts.search);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.category) params.set("category", opts.category);
  if (opts?.page) params.set("page", String(opts.page));
  const qs = params.toString();

  let res: Response;
  try {
    res = await fetch(`${backendBase()}/api/admin/blog/posts${qs ? `?${qs}` : ""}`, {
      headers: await authHeaders(getToken),
      cache: "no-store",
    });
  } catch {
    throw new Error(unreachableMessage());
  }
  if (!res.ok) throw new Error(await readError(res, "Failed to load posts"));
  return res.json();
}

export async function fetchBlogPost(
  id: string,
  getToken: () => Promise<string | null>
): Promise<AdminBlogPost> {
  const res = await fetch(`${backendBase()}/api/admin/blog/posts/${id}`, {
    headers: await authHeaders(getToken),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to load post"));
  const body = (await res.json()) as { post: AdminBlogPost };
  return body.post;
}

export async function fetchBlogCategories(
  getToken: () => Promise<string | null>
): Promise<string[]> {
  const res = await fetch(`${backendBase()}/api/admin/blog/categories`, {
    headers: await authHeaders(getToken),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to load categories"));
  const body = (await res.json()) as { categories: string[] };
  return body.categories;
}

export async function createBlogPost(
  input: BlogPostInput,
  getToken: () => Promise<string | null>
): Promise<AdminBlogPost> {
  const res = await fetch(`${backendBase()}/api/admin/blog/posts`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || "Failed to create post");
  return (body as { post: AdminBlogPost }).post;
}

export async function updateBlogPost(
  id: string,
  input: BlogPostInput,
  getToken: () => Promise<string | null>
): Promise<AdminBlogPost> {
  const res = await fetch(`${backendBase()}/api/admin/blog/posts/${id}`, {
    method: "PUT",
    headers: await authHeaders(getToken),
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || "Failed to update post");
  return (body as { post: AdminBlogPost }).post;
}

export async function deleteBlogPost(
  id: string,
  getToken: () => Promise<string | null>
): Promise<void> {
  const res = await fetch(`${backendBase()}/api/admin/blog/posts/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to delete post"));
}

export async function uploadBlogImage(
  file: File,
  getToken: () => Promise<string | null>
): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const headers: HeadersInit = {};
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${backendBase()}/api/admin/blog/upload-image`, {
    method: "POST",
    headers,
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || "Upload failed");
  return (body as { url: string }).url;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
