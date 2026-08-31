"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { BlogEditor } from "@/components/blog/BlogEditor";
import {
  createBlogPost,
  slugify,
  updateBlogPost,
  uploadBlogImage,
  type AdminBlogPost,
  type BlogPostInput,
} from "@/lib/blog-api";
import { publicBlogPostUrl } from "@/lib/site";

type Props = {
  post?: AdminBlogPost;
  categories: string[];
};

const DEFAULT_CATEGORIES = ["BlueFox", "Pipeline", "Plans", "General"];

export function BlogPostForm({ post, categories }: Props) {
  const router = useRouter();
  const { getToken } = useAuth();
  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);
  const slugTouched = useRef(Boolean(post?.slug));

  const [title, setTitle] = useState(post?.title ?? "");
  const [headline, setHeadline] = useState(post?.headline ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [category, setCategory] = useState(post?.category ?? "BlueFox");
  const [author, setAuthor] = useState(post?.author ?? "Hydrilla");
  const [status, setStatus] = useState<"draft" | "published">(post?.status ?? "draft");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? "");
  const [seoImage, setSeoImage] = useState(post?.seoImage ?? "");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categories])].sort();

  const markDirty = () => setDirty(true);

  useEffect(() => {
    if (!slugTouched.current && title) {
      setSlug(slugify(title));
    }
  }, [title]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleUpload = async (file: File) => {
    try {
      const url = await uploadBlogImage(file, token);
      toast.success("Image uploaded");
      return url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      throw err;
    }
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Title is required";
    if (!slug.trim()) return "Slug is required";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return "Slug must be lowercase letters, numbers, and hyphens";
    }
    if (!author.trim()) return "Author is required";
    if (!category.trim()) return "Category is required";
    if (status === "published") {
      if (!excerpt.trim()) return "Excerpt is required to publish";
      if (!content.trim() || content === "<p></p>") return "Content is required to publish";
    }
    return null;
  };

  const buildInput = (): BlogPostInput => ({
    title: title.trim(),
    headline: headline.trim() || null,
    slug: slug.trim(),
    excerpt: excerpt.trim(),
    content,
    coverImage: coverImage.trim() || null,
    category: category.trim(),
    author: author.trim(),
    status,
    seoTitle: seoTitle.trim() || null,
    seoDescription: seoDescription.trim() || null,
    seoImage: seoImage.trim() || null,
  });

  const save = async (nextStatus?: "draft" | "published") => {
    const effectiveStatus = nextStatus ?? status;
    const input = buildInput();
    input.status = effectiveStatus;

    if (effectiveStatus === "published") {
      const err = validate();
      if (err) {
        toast.error(err);
        return;
      }
    } else if (!input.title.trim() || !input.slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }

    setBusy(true);
    try {
      if (post) {
        await updateBlogPost(post.id, input, token);
        toast.success(input.status === "published" ? "Published" : "Saved");
      } else {
        const created = await createBlogPost(input, token);
        toast.success(input.status === "published" ? "Published" : "Draft saved");
        setDirty(false);
        router.replace(`/blog/${created.id}`);
        return;
      }
      setDirty(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Blog</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {post ? "Edit post" : "New post"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {post && slug.trim() && status === "published" ? (
            <Button asChild variant="outline">
              <a href={publicBlogPostUrl(slug)} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                View live page
              </a>
            </Button>
          ) : null}
          <Button variant="outline" disabled={busy} onClick={() => void save("draft")}>
            Save draft
          </Button>
          <Button disabled={busy} onClick={() => void save("published")}>
            {status === "published" ? "Update" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="headline">Headline (page H1)</Label>
            <Input
              id="headline"
              value={headline}
              placeholder={title || "Same as title if empty"}
              onChange={(e) => {
                setHeadline(e.target.value);
                markDirty();
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                slugTouched.current = true;
                setSlug(e.target.value);
                markDirty();
              }}
            />
            {slug.trim() && status === "published" ? (
              <a
                href={publicBlogPostUrl(slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                <ExternalLink className="size-3" />
                {publicBlogPostUrl(slug)}
              </a>
            ) : slug.trim() ? (
              <p className="text-xs text-muted-foreground">
                Live URL after publish: {publicBlogPostUrl(slug)}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                markDirty();
              }}
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => {
                setAuthor(e.target.value);
                markDirty();
              }}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              rows={3}
              value={excerpt}
              onChange={(e) => {
                setExcerpt(e.target.value);
                markDirty();
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Content</Label>
          <BlogEditor
            value={content}
            onChange={(html) => {
              setContent(html);
              markDirty();
            }}
            onUploadImage={handleUpload}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cover">Cover image URL</Label>
            <div className="flex gap-2">
              <Input
                id="cover"
                value={coverImage}
                placeholder="https://…"
                onChange={(e) => {
                  setCoverImage(e.target.value);
                  markDirty();
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    try {
                      const url = await handleUpload(file);
                      setCoverImage(url);
                      markDirty();
                    } catch {
                      /* toast shown */
                    }
                  };
                  input.click();
                }}
              >
                Upload
              </Button>
            </div>
          </div>
        </div>

        <details className="rounded-lg border border-border p-4">
          <summary className="cursor-pointer text-sm font-medium">SEO settings</summary>
          <div className="mt-4 grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="seoTitle">SEO title</Label>
              <Input
                id="seoTitle"
                value={seoTitle}
                placeholder={title}
                onChange={(e) => {
                  setSeoTitle(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seoDescription">SEO description</Label>
              <Textarea
                id="seoDescription"
                rows={2}
                value={seoDescription}
                placeholder={excerpt}
                onChange={(e) => {
                  setSeoDescription(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seoImage">SEO / social image URL</Label>
              <Input
                id="seoImage"
                value={seoImage}
                placeholder={coverImage || "https://…"}
                onChange={(e) => {
                  setSeoImage(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>
        </details>

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "draft" | "published");
              markDirty();
            }}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
