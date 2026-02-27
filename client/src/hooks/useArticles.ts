import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { DEMO_ARTICLES, DEMO_CATEGORIES, DEMO_COMMENTS } from "@/lib/demo-data";
import type { Article, Category, PublicComment } from "@/lib/types";

// Helper to get visitor ID for likes
function getVisitorId(): string {
  let id = localStorage.getItem("visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("visitor_id", id);
  }
  return id;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCategories(DEMO_CATEGORIES);
      setLoading(false);
      return;
    }
    supabase
      .from("categories")
      .select("*")
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setCategories(DEMO_CATEGORIES);
        } else {
          setCategories(data || []);
        }
        setLoading(false);
      });
  }, []);

  return { categories, loading };
}

export function useArticles(options?: {
  categorySlug?: string;
  searchQuery?: string;
  sortBy?: "latest" | "popular";
  limit?: number;
  status?: "published" | "draft" | "all";
}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      let filtered = [...DEMO_ARTICLES];

      if (options?.status && options.status !== "all") {
        filtered = filtered.filter((a) => a.status === options.status);
      } else if (!options?.status) {
        filtered = filtered.filter((a) => a.status === "published");
      }

      if (options?.categorySlug) {
        filtered = filtered.filter(
          (a) => a.category?.slug === options.categorySlug
        );
      }

      if (options?.searchQuery) {
        const q = options.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
            (a.category?.name && a.category.name.toLowerCase().includes(q))
        );
      }

      if (options?.sortBy === "popular") {
        filtered.sort((a, b) => b.likes_count - a.likes_count);
      } else {
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      setArticles(filtered);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("articles")
      .select("*, category:categories(*), author:profiles(*)");

    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    } else if (!options?.status) {
      query = query.eq("status", "published");
    }

    if (options?.categorySlug) {
      query = query.eq("category.slug", options.categorySlug);
    }

    if (options?.searchQuery) {
      const q = options.searchQuery;
      query = query.or(
        `title.ilike.%${q}%,excerpt.ilike.%${q}%`
      );
    }

    if (options?.sortBy === "popular") {
      query = query.order("likes_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      setArticles(DEMO_ARTICLES);
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  }, [
    options?.categorySlug,
    options?.searchQuery,
    options?.sortBy,
    options?.limit,
    options?.status,
  ]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return { articles, loading, refetch: fetchArticles };
}

export function useArticle(slug: string) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const found = DEMO_ARTICLES.find((a) => a.slug === slug);
      setArticle(found || null);
      setLoading(false);
      return;
    }

    supabase
      .from("articles")
      .select("*, category:categories(*), author:profiles(*)")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          const found = DEMO_ARTICLES.find((a) => a.slug === slug);
          setArticle(found || null);
        } else {
          setArticle(data);
        }
        setLoading(false);
      });
  }, [slug]);

  return { article, loading };
}

export function useComments(articleId: string) {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setComments(DEMO_COMMENTS.filter((c) => c.article_id === articleId));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("public_comments")
      .select("*")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setComments(data || []);
    }
    setLoading(false);
  }, [articleId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (authorName: string, content: string) => {
    if (!isSupabaseConfigured()) {
      const newComment: PublicComment = {
        id: `com-${Date.now()}`,
        article_id: articleId,
        author_name: authorName,
        content,
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [...prev, newComment]);
      return { error: null };
    }

    const { error } = await supabase
      .from("public_comments")
      .insert({ article_id: articleId, author_name: authorName, content });

    if (error) return { error: error.message };
    await fetchComments();
    return { error: null };
  };

  return { comments, loading, addComment, refetch: fetchComments };
}

export function useLike(articleId: string) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const visitorId = getVisitorId();

    if (!isSupabaseConfigured()) {
      const article = DEMO_ARTICLES.find((a) => a.id === articleId);
      setLikesCount(article?.likes_count || 0);
      const likedArticles = JSON.parse(
        localStorage.getItem("liked_articles") || "[]"
      );
      setLiked(likedArticles.includes(articleId));
      return;
    }

    // Check if already liked
    supabase
      .from("likes")
      .select("id")
      .eq("article_id", articleId)
      .eq("visitor_id", visitorId)
      .then(({ data }) => {
        setLiked((data?.length || 0) > 0);
      });

    // Get likes count
    supabase
      .from("articles")
      .select("likes_count")
      .eq("id", articleId)
      .single()
      .then(({ data }) => {
        setLikesCount(data?.likes_count || 0);
      });
  }, [articleId]);

  const toggleLike = async () => {
    const visitorId = getVisitorId();

    if (!isSupabaseConfigured()) {
      const likedArticles = JSON.parse(
        localStorage.getItem("liked_articles") || "[]"
      );
      if (liked) {
        const updated = likedArticles.filter((id: string) => id !== articleId);
        localStorage.setItem("liked_articles", JSON.stringify(updated));
        setLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        likedArticles.push(articleId);
        localStorage.setItem("liked_articles", JSON.stringify(likedArticles));
        setLiked(true);
        setLikesCount((prev) => prev + 1);
      }
      return;
    }

    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("article_id", articleId)
        .eq("visitor_id", visitorId);
      setLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
      // Update article likes_count
      await supabase.rpc("decrement_likes", { article_id: articleId });
    } else {
      await supabase
        .from("likes")
        .insert({ article_id: articleId, visitor_id: visitorId });
      setLiked(true);
      setLikesCount((prev) => prev + 1);
      await supabase.rpc("increment_likes", { article_id: articleId });
    }
  };

  return { liked, likesCount, toggleLike };
}
