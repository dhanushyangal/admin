"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { BlogPostForm } from "@/components/blog/BlogPostForm";
import { fetchBlogCategories, fetchBlogPost, type AdminBlogPost } from "@/lib/blog-api";

type Props = { params: Promise<{ id: string }> };

export default function EditBlogPostPage({ params }: Props) {
  const { getToken } = useAuth();
  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);
  const [post, setPost] = useState<AdminBlogPost | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const [p, cats] = await Promise.all([fetchBlogPost(id, token), fetchBlogCategories(token)]);
        setPost(p);
        setCategories(cats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load post");
      }
    })();
  }, [id, token]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!post) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return <BlogPostForm post={post} categories={categories} />;
}
