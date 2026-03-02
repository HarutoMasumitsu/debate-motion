import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MessageSquare,
  LogOut,
  Users,
  BarChart3,
  ChevronRight,
  FolderOpen,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useArticles, useCategories } from "@/hooks/useArticles";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { DEMO_COMMENTS } from "@/lib/demo-data";
import { toast } from "sonner";
import type { Article, PublicComment, Category } from "@/lib/types";

export default function AdminDashboard() {
  const { profile, signOut, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const { articles, loading, refetch } = useArticles({ status: "all" });
  const [activeTab, setActiveTab] = useState<
    "articles" | "comments" | "categories" | "users"
  >("articles");

  const isDemoMode = !isSupabaseConfigured();

  const handleSignOut = async () => {
    if (isDemoMode) {
      navigate("/");
      return;
    }
    await signOut();
    navigate("/");
  };

  const handleToggleStatus = async (article: Article) => {
    if (isDemoMode) {
      toast.info("デモモードでは記事のステータスを変更できません。Supabaseを設定してください。");
      return;
    }
    if (!isAdmin && article.status === "draft") {
      toast.error("記事の公開は管理者のみ可能です。");
      return;
    }
    const newStatus = article.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("articles")
      .update({ status: newStatus })
      .eq("id", article.id);

    if (error) {
      toast.error("ステータスの変更に失敗しました。");
    } else {
      toast.success(
        newStatus === "published" ? "記事を公開しました。" : "記事を下書きに戻しました。"
      );
      refetch();
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm("この記事を削除しますか？この操作は取り消せません。")) return;

    if (isDemoMode) {
      toast.info("デモモードでは記事を削除できません。Supabaseを設定してください。");
      return;
    }

    const { error } = await supabase.from("articles").delete().eq("id", articleId);
    if (error) {
      toast.error("記事の削除に失敗しました。");
    } else {
      toast.success("記事を削除しました。");
      refetch();
    }
  };

  const publishedCount = articles.filter((a) => a.status === "published").length;
  const draftCount = articles.filter((a) => a.status === "draft").length;
  const totalLikes = articles.reduce((sum, a) => sum + a.likes_count, 0);

  const sidebarItems = [
    { id: "articles" as const, label: "記事管理", icon: FileText },
    { id: "categories" as const, label: "カテゴリー管理", icon: FolderOpen },
    { id: "comments" as const, label: "コメント管理", icon: MessageSquare },
    ...(isAdmin || isDemoMode
      ? [{ id: "users" as const, label: "ユーザー管理", icon: Users }]
      : []),
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar shrink-0 hidden md:flex flex-col">
        <div className="p-5 border-b border-border">
          <Link href="/">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm font-sans">M</span>
              </div>
              <div>
                <span className="font-serif text-sm font-semibold block leading-tight">Motion解説</span>
                <span className="text-[10px] text-muted-foreground">管理画面</span>
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors ${
                activeTab === item.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">
                {isDemoMode ? "D" : profile?.display_name?.charAt(0) || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {isDemoMode ? "デモユーザー" : profile?.display_name || "ユーザー"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isDemoMode ? "デモモード" : profile?.role === "admin" ? "管理者" : "執筆者"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5" />
            {isDemoMode ? "ホームに戻る" : "ログアウト"}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
          <Link href="/">
            <span className="font-serif text-sm font-semibold">Motion解説 管理画面</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden flex border-b border-border overflow-x-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-3 text-xs font-medium text-center transition-colors whitespace-nowrap px-2 ${
                activeTab === item.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <p className="text-sm text-amber-800">
              デモモードで表示しています。Supabaseを設定すると、実際のデータ管理が可能になります。
            </p>
          </div>
        )}

        <div className="p-6">
          {activeTab === "articles" && (
            <div>
              {/* Stats cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-card rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs font-medium">公開記事</span>
                  </div>
                  <p className="text-2xl font-bold font-serif">{publishedCount}</p>
                </div>
                <div className="bg-card rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-medium">下書き</span>
                  </div>
                  <p className="text-2xl font-bold font-serif">{draftCount}</p>
                </div>
                <div className="bg-card rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-xs font-medium">総いいね数</span>
                  </div>
                  <p className="text-2xl font-bold font-serif">{totalLikes}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <h1 className="font-serif text-xl font-semibold">記事管理</h1>
                <Link href="/admin/editor">
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    新規作成
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-card rounded-lg border border-border p-4 animate-pulse"
                    >
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {articles.map((article) => (
                    <div
                      key={article.id}
                      className="bg-card rounded-lg border border-border p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              article.status === "published"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {article.status === "published" ? "公開" : "下書き"}
                          </span>
                          {article.category && (
                            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                              {article.category.name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-sm mb-1">{article.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {article.author_name && (
                            <span className="mr-2">著者: {article.author_name}</span>
                          )}
                          {new Date(article.updated_at).toLocaleDateString("ja-JP")} 更新
                          {" · "}♥ {article.likes_count}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/articles/${article.slug}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="プレビュー">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/admin/editor/${article.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="編集">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleStatus(article)}
                          title={article.status === "published" ? "下書きに戻す" : "公開する"}
                        >
                          {article.status === "published" ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(article.id)}
                          title="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {articles.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">
                        まだ記事がありません。
                      </p>
                      <Link href="/admin/editor">
                        <Button variant="outline" size="sm" className="mt-3">
                          最初の記事を作成
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "categories" && <CategoriesTab />}
          {activeTab === "comments" && <CommentsTab />}
          {activeTab === "users" && <UsersTab />}
        </div>
      </main>
    </div>
  );
}

// ===== Categories Tab =====
function CategoriesTab() {
  const { categories, loading } = useCategories();
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const isDemoMode = !isSupabaseConfigured();

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  const handleNameChange = (value: string) => {
    setNewName(value);
    if (!newSlug || newSlug === generateSlug(newName)) {
      setNewSlug(generateSlug(value));
    }
  };

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      toast.error("カテゴリー名を入力してください。");
      return;
    }
    const slug = newSlug.trim() || generateSlug(newName);
    if (!slug) {
      toast.error("スラッグ（英語のURL用名前）を入力してください。");
      return;
    }

    if (isDemoMode) {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: newName.trim(),
        slug,
        description: newDescription.trim() || null,
        image_url: null,
        created_at: new Date().toISOString(),
      };
      setLocalCategories((prev) => [...prev, newCat]);
      setNewName("");
      setNewSlug("");
      setNewDescription("");
      toast.success("カテゴリーを追加しました（デモモード）。");
      return;
    }

    const { error } = await supabase.from("categories").insert({
      name: newName.trim(),
      slug,
      description: newDescription.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("同じスラッグのカテゴリーが既に存在します。");
      } else {
        toast.error("カテゴリーの追加に失敗しました。");
      }
    } else {
      toast.success("カテゴリーを追加しました。");
      setNewName("");
      setNewSlug("");
      setNewDescription("");
      // Refresh
      const { data } = await supabase.from("categories").select("*").order("name");
      if (data) setLocalCategories(data);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("このカテゴリーを削除しますか？紐づいた記事のカテゴリーは空になります。")) return;

    if (isDemoMode) {
      setLocalCategories((prev) => prev.filter((c) => c.id !== catId));
      toast.success("カテゴリーを削除しました（デモモード）。");
      return;
    }

    const { error } = await supabase.from("categories").delete().eq("id", catId);
    if (error) {
      toast.error("カテゴリーの削除に失敗しました。");
    } else {
      toast.success("カテゴリーを削除しました。");
      setLocalCategories((prev) => prev.filter((c) => c.id !== catId));
    }
  };

  return (
    <div>
      <h1 className="font-serif text-xl font-semibold mb-6">カテゴリー管理</h1>

      {/* Add new category form */}
      <div className="bg-card rounded-lg border border-border p-5 mb-6">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新しいカテゴリーを追加
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              カテゴリー名 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="例: Technology"
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              スラッグ（URL用） <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="例: technology"
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              説明（任意）
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="カテゴリーの説明"
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" className="gap-1.5" onClick={handleAddCategory}>
            <Save className="h-3.5 w-3.5" />
            追加
          </Button>
        </div>
      </div>

      {/* Category list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {localCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-card rounded-lg border border-border p-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-sm">{cat.name}</h3>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    /{cat.slug}
                  </span>
                </div>
                {cat.description && (
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                onClick={() => handleDeleteCategory(cat.id)}
                title="カテゴリーを削除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {localCategories.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">カテゴリーはまだありません。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Comments Tab =====
function CommentsTab() {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loading, setLoading] = useState(true);
  const isDemoMode = !isSupabaseConfigured();

  useEffect(() => {
    if (isDemoMode) {
      setComments(DEMO_COMMENTS);
      setLoading(false);
      return;
    }

    supabase
      .from("public_comments")
      .select("*, article:articles(title)")
      .order("created_at", { ascending: false })
      .then(({ data, error }: any) => {
        if (!error && data) setComments(data);
        setLoading(false);
      });
  }, [isDemoMode]);

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("このコメントを削除しますか？")) return;

    if (isDemoMode) {
      toast.info("デモモードではコメントを削除できません。");
      return;
    }

    const { error } = await supabase
      .from("public_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast.error("コメントの削除に失敗しました。");
    } else {
      toast.success("コメントを削除しました。");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  return (
    <div>
      <h1 className="font-serif text-xl font-semibold mb-6">コメント管理</h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4 animate-pulse">
              <div className="h-3 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-card rounded-lg border border-border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-primary">
                        {comment.author_name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{comment.author_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 mb-1.5 pl-8">{comment.content}</p>
                  <p className="text-xs text-muted-foreground pl-8">
                    記事ID: {comment.article_id}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleDeleteComment(comment.id)}
                  title="コメントを削除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {comments.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">コメントはまだありません。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Users Tab =====
function UsersTab() {
  return (
    <div>
      <h1 className="font-serif text-xl font-semibold mb-6">ユーザー管理</h1>
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-medium text-sm mb-3">ユーザー管理について</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          ユーザー管理はSupabaseダッシュボードの Authentication セクションから行えます。
        </p>
        <div className="bg-secondary/50 rounded-md p-4 space-y-2">
          <p className="text-sm font-medium">操作手順:</p>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Supabaseダッシュボードにログイン</li>
            <li>Authentication → Users でユーザーを追加</li>
            <li>Table Editor → profiles テーブルで role を「admin」または「writer」に変更</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
