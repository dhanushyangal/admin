"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { BlogPostForm } from "@/components/blog/BlogPostForm";
import { fetchBlogCategories } from "@/lib/blog-api";

export default function NewBlogPostPage() {
  const { getToken } = useAuth();
  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    void fetchBlogCategories(token).then(setCategories).catch(() => setCategories([]));
  }, [token]);

  return <BlogPostForm categories={categories} />;
}
