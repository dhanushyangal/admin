"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { FileText, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteBlogPost, fetchBlogCategories, fetchBlogPosts, type AdminBlogPost } from "@/lib/blog-api";
import { publicBlogIndexUrl, publicBlogPostUrl } from "@/lib/site";

export default function BlogListPage() {
  const { getToken } = useAuth();
  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);

  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminBlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, cats] = await Promise.all([
        fetchBlogPosts(token, {
          search: search || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
        }),
        fetchBlogCategories(token),
      ]);
      setPosts(list.posts);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, categoryFilter]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBlogPost(deleteTarget.id, token);
      toast.success("Post deleted");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Blog</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Posts</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage published articles on hydrilla.ai/blog</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={publicBlogIndexUrl()} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              View live blog
            </a>
          </Button>
          <Button asChild>
            <Link href="/blog/new">
              <Plus />
              New post
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search posts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No posts found</p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/blog/new">Create your first post</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div>
                      <Link
                        href={`/blog/${post.id}`}
                        className="font-medium hover:underline"
                      >
                        {post.title}
                      </Link>
                      {post.status === "published" ? (
                        <a
                          href={publicBlogPostUrl(post.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                          /blog/{post.slug}
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground">/blog/{post.slug}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{post.category}</TableCell>
                  <TableCell>
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{post.author}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {post.status === "published" ? (
                        <Button asChild size="sm" variant="ghost">
                          <a
                            href={publicBlogPostUrl(post.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink />
                            Live
                          </a>
                        </Button>
                      ) : null}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/blog/${post.id}`}>Edit</Link>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(post)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.title}&rdquo;. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
