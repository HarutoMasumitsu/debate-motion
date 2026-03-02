import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Send,
  MessageSquareText,
  Image as ImageIcon,
  Tag,
  Users,
  Columns2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useCategories } from "@/hooks/useArticles";
import { DEMO_ARTICLES, DEFAULT_THUMBNAIL } from "@/lib/demo-data";
import { toast } from "sonner";
import type { InternalComment } from "@/lib/types";

// ===== Markdown Renderer (shared with ArticleDetailPage) =====

interface MarkdownNode {
  type: string;
  content?: string;
  children?: MarkdownNode[];
  level?: number;
  ordered?: boolean;
  start?: number;
}

function parseMarkdown(text: string): MarkdownNode[] {
  if (!text || typeof text !== "string") return [];
  const lines = text.split("\n");
  const nodes: MarkdownNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({ type: "heading", level: headingMatch[1].length, content: headingMatch[2] });
      i++; continue;
    }
    if (line.trim().startsWith("> ")) {
      let quoteContent = "";
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteContent += lines[i].trim().replace(/^>\s?/, "") + "\n";
        i++;
      }
      nodes.push({ type: "blockquote", content: quoteContent.trim() });
      continue;
    }
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const listNode = parseListBlock(lines, i);
      nodes.push(listNode.node);
      i = listNode.nextIndex;
      continue;
    }
    let paragraphContent = line;
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      if (
        nextLine.trim() === "" ||
        nextLine.match(/^#{1,6}\s/) ||
        nextLine.match(/^\s*([-*+]|\d+\.)\s/) ||
        nextLine.trim().startsWith("> ")
      ) break;
      paragraphContent += " " + nextLine;
      i++;
    }
    nodes.push({ type: "paragraph", content: paragraphContent });
  }
  return nodes;
}

function parseListBlock(lines: string[], startIndex: number): { node: MarkdownNode; nextIndex: number } {
  const firstLine = lines[startIndex];
  const firstMatch = firstLine.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
  if (!firstMatch) return { node: { type: "paragraph", content: firstLine }, nextIndex: startIndex + 1 };
  const baseIndent = firstMatch[1].length;
  const isOrdered = /^\d+\./.test(firstMatch[2]);
  const items: MarkdownNode[] = [];
  let i = startIndex;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (!match) {
      if (line.trim() === "") {
        if (i + 1 < lines.length && lines[i + 1].match(/^(\s*)([-*+]|\d+\.)\s/)) { i++; continue; }
        break;
      }
      break;
    }
    const indent = match[1].length;
    if (indent < baseIndent) break;
    if (indent === baseIndent) {
      items.push({ type: "listItem", content: match[3] });
      i++;
    } else {
      const subList = parseListBlock(lines, i);
      if (items.length > 0) {
        if (!items[items.length - 1].children) items[items.length - 1].children = [];
        items[items.length - 1].children!.push(subList.node);
      }
      i = subList.nextIndex;
    }
  }
  return { node: { type: "list", ordered: isOrdered, start: isOrdered ? parseInt(firstMatch[2]) : undefined, children: items }, nextIndex: i };
}

function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    const codeMatch = remaining.match(/`(.+?)`/);
    const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);
    const matches = [
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: "italic", match: italicMatch, index: italicMatch.index! } : null,
      codeMatch ? { type: "code", match: codeMatch, index: codeMatch.index! } : null,
      linkMatch ? { type: "link", match: linkMatch, index: linkMatch.index! } : null,
    ].filter(Boolean) as { type: string; match: RegExpMatchArray; index: number }[];
    if (matches.length === 0) { parts.push(remaining); break; }
    matches.sort((a, b) => a.index - b.index);
    const earliest = matches[0];
    if (earliest.index > 0) parts.push(remaining.substring(0, earliest.index));
    switch (earliest.type) {
      case "bold":
        parts.push(<strong key={key++}>{earliest.match[1]}</strong>);
        remaining = remaining.substring(earliest.index + earliest.match[0].length);
        break;
      case "italic":
        parts.push(<em key={key++}>{earliest.match[1]}</em>);
        remaining = remaining.substring(earliest.index + earliest.match[0].length);
        break;
      case "code":
        parts.push(<code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{earliest.match[1]}</code>);
        remaining = remaining.substring(earliest.index + earliest.match[0].length);
        break;
      case "link":
        parts.push(<a key={key++} href={earliest.match[2]} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">{earliest.match[1]}</a>);
        remaining = remaining.substring(earliest.index + earliest.match[0].length);
        break;
    }
  }
  return <>{parts}</>;
}

function renderNode(node: MarkdownNode, key: number): React.ReactNode {
  switch (node.type) {
    case "heading": {
      const className = `font-serif font-semibold ${
        node.level === 1 ? "text-2xl mt-8 mb-4" : node.level === 2 ? "text-xl mt-6 mb-3" : "text-lg mt-5 mb-2"
      }`;
      const level = Math.min(node.level || 2, 6);
      if (level === 1) return <h1 key={key} className={className}>{renderInlineMarkdown(node.content || "")}</h1>;
      if (level === 2) return <h2 key={key} className={className}>{renderInlineMarkdown(node.content || "")}</h2>;
      if (level === 3) return <h3 key={key} className={className}>{renderInlineMarkdown(node.content || "")}</h3>;
      if (level === 4) return <h4 key={key} className={className}>{renderInlineMarkdown(node.content || "")}</h4>;
      if (level === 5) return <h5 key={key} className={className}>{renderInlineMarkdown(node.content || "")}</h5>;
      return <h6 key={key} className={className}>{renderInlineMarkdown(node.content || "")}</h6>;
    }
    case "paragraph":
      return <p key={key} className="mb-4 leading-relaxed">{renderInlineMarkdown(node.content || "")}</p>;
    case "blockquote":
      return (
        <blockquote key={key} className="border-l-4 border-primary/30 pl-4 py-1 my-4 text-muted-foreground italic">
          {renderInlineMarkdown(node.content || "")}
        </blockquote>
      );
    case "list": {
      const ListTag = node.ordered ? "ol" : "ul";
      const listClass = node.ordered ? "list-decimal pl-6 mb-4 space-y-1" : "list-disc pl-6 mb-4 space-y-1";
      return (
        <ListTag key={key} className={listClass} start={node.start}>
          {node.children?.map((child, ci) => renderNode(child, ci))}
        </ListTag>
      );
    }
    case "listItem":
      return (
        <li key={key} className="leading-relaxed">
          {renderInlineMarkdown(node.content || "")}
          {node.children?.map((child, ci) => renderNode(child, ci))}
        </li>
      );
    default:
      return null;
  }
}

function MarkdownPreview({ content }: { content: string }) {
  const nodes = parseMarkdown(content);
  if (!content.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/40 text-sm">
        本文を入力するとここにプレビューが表示されます
      </div>
    );
  }
  return <div className="prose-article">{nodes.map((node, i) => renderNode(node, i))}</div>;
}

// ===== Main Component =====

export default function ArticleEditor() {
  const params = useParams<{ id: string }>();
  const articleId = params.id;
  const isEditing = !!articleId;
  const { profile } = useAuth();
  const [, navigate] = useLocation();
  const { categories } = useCategories();

  const isDemoMode = !isSupabaseConfigured();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  // Editor view mode: "edit" | "split" | "preview"
  const [viewMode, setViewMode] = useState<"edit" | "split" | "preview">("split");

  // Internal comments
  const [internalComments, setInternalComments] = useState<InternalComment[]>([]);
  const [newInternalComment, setNewInternalComment] = useState("");

  // Auto-generate slug from title
  const generateSlug = useCallback((t: string) => {
    return t.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  }, []);

  useEffect(() => {
    if (!isEditing && title && !slug) setSlug(generateSlug(title));
  }, [title, isEditing, slug, generateSlug]);

  // Load article data when editing
  useEffect(() => {
    if (!isEditing) return;
    if (isDemoMode) {
      const article = DEMO_ARTICLES.find((a) => a.id === articleId);
      if (article) {
        setTitle(article.title);
        setSlug(article.slug);
        setContent(typeof article.content === "string" ? article.content : "");
        setExcerpt(article.excerpt || "");
        setThumbnailUrl(article.thumbnail_url || "");
        setCategoryId(article.category_id || "");
        setAuthorName(article.author_name || "");
        setStatus(article.status);
      }
      setLoading(false);
      return;
    }
    supabase.from("articles").select("*").eq("id", articleId).single().then(({ data, error }) => {
      if (error || !data) { toast.error("記事の読み込みに失敗しました。"); navigate("/admin"); return; }
      setTitle(data.title);
      setSlug(data.slug);
      setContent(typeof data.content === "string" ? data.content : "");
      setExcerpt(data.excerpt || "");
      setThumbnailUrl(data.thumbnail_url || "");
      setCategoryId(data.category_id || "");
      setAuthorName(data.author_name || "");
      setStatus(data.status);
      setLoading(false);
    });
    supabase.from("internal_comments").select("*, user:profiles(*)").eq("article_id", articleId).order("created_at", { ascending: true }).then(({ data }: any) => {
      if (data) setInternalComments(data);
    });
  }, [articleId, isEditing, isDemoMode, navigate]);

  const handleSave = async (newStatus?: "draft" | "published") => {
    if (!title.trim()) { toast.error("タイトルを入力してください。"); return; }
    if (!slug.trim()) { toast.error("スラッグを入力してください。"); return; }
    if (isDemoMode) { toast.info("デモモードでは保存できません。Supabaseを設定してください。"); return; }
    setSaving(true);
    const finalStatus = newStatus || status;
    const articleData = {
      title: title.trim(), slug: slug.trim(), content, excerpt: excerpt.trim() || null,
      thumbnail_url: thumbnailUrl.trim() || null, category_id: categoryId || null,
      author_name: authorName.trim() || null, status: finalStatus, updated_at: new Date().toISOString(),
    };
    if (isEditing) {
      const { error } = await supabase.from("articles").update(articleData).eq("id", articleId);
      if (error) { toast.error("記事の更新に失敗しました。"); console.error(error); }
      else toast.success(finalStatus === "published" ? "記事を公開しました。" : "下書きを保存しました。");
    } else {
      const { error } = await supabase.from("articles").insert({ ...articleData, author_id: profile?.id });
      if (error) { toast.error("記事の作成に失敗しました。"); console.error(error); }
      else { toast.success("記事を作成しました。"); navigate("/admin"); }
    }
    setSaving(false);
  };

  const handleAddInternalComment = async () => {
    if (!newInternalComment.trim()) return;
    if (isDemoMode) { toast.info("デモモードでは内部コメントを追加できません。"); return; }
    const { error } = await supabase.from("internal_comments").insert({ article_id: articleId, user_id: profile?.id, content: newInternalComment.trim() });
    if (error) { toast.error("コメントの追加に失敗しました。"); }
    else {
      setNewInternalComment("");
      const { data } = await supabase.from("internal_comments").select("*, user:profiles(*)").eq("article_id", articleId).order("created_at", { ascending: true });
      if (data) setInternalComments(data as any);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                管理画面
              </span>
            </Link>
            <span className="text-xs text-muted-foreground">
              {isEditing ? "記事を編集" : "新規記事作成"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="hidden md:flex items-center gap-0.5 bg-secondary rounded-md p-0.5 mr-1">
              <button
                onClick={() => setViewMode("edit")}
                title="編集のみ"
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <EyeOff className="h-3 w-3" />
                編集
              </button>
              <button
                onClick={() => setViewMode("split")}
                title="分割表示"
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === "split" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Columns2 className="h-3 w-3" />
                分割
              </button>
              <button
                onClick={() => setViewMode("preview")}
                title="プレビューのみ"
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3 w-3" />
                プレビュー
              </button>
            </div>

            {isEditing && (
              <Link href={`/articles/${slug}`}>
                <Button variant="ghost" size="sm" className="gap-1.5 hidden md:inline-flex">
                  <Eye className="h-3.5 w-3.5" />
                  公開ページ
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              下書き保存
            </Button>
            <Button size="sm" onClick={() => handleSave("published")} disabled={saving} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              公開
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title & meta fields */}
          <div className="px-6 md:px-8 pt-6 pb-4 border-b border-border bg-background">
            <input
              type="text"
              placeholder="記事タイトル"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (!isEditing) setSlug(generateSlug(e.target.value)); }}
              className="w-full text-2xl md:text-3xl font-serif font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 mb-2"
            />
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground">URL:</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="text-xs text-muted-foreground bg-transparent border-b border-dashed border-border outline-none flex-1 py-0.5"
                placeholder="url-slug"
              />
            </div>

            {/* Meta fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-secondary/30 rounded-lg border border-border">
              {/* Category */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <Tag className="h-3 w-3" />カテゴリー
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">カテゴリーを選択...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Author */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <Users className="h-3 w-3" />著者名（自由入力）
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="例: 益満・田中"
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Thumbnail */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <ImageIcon className="h-3 w-3" />サムネイル画像URL（空欄の場合はデフォルト画像を使用）
                </label>
                <div className="flex gap-2 items-start">
                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
                  />
                  {(thumbnailUrl || DEFAULT_THUMBNAIL) && (
                    <div className="rounded-md overflow-hidden border border-border h-10 w-16 shrink-0">
                      <img
                        src={thumbnailUrl || DEFAULT_THUMBNAIL}
                        alt="サムネイルプレビュー"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_THUMBNAIL; }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Excerpt */}
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  概要（記事一覧に表示される説明文）
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="記事の概要を入力..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50 resize-none"
                  maxLength={200}
                />
              </div>
            </div>
          </div>

          {/* Editor / Preview area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Edit pane */}
            {(viewMode === "edit" || viewMode === "split") && (
              <div className={`flex flex-col ${viewMode === "split" ? "w-1/2 border-r border-border" : "w-full"}`}>
                <div className="bg-secondary/20 px-4 py-1.5 border-b border-border flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Markdown 編集</span>
                  <span className="text-[10px] text-muted-foreground/50 ml-auto">{content.length} 文字</span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={"# 見出し\n\n本文を入力...\n\n## 小見出し\n\n- リスト項目1\n    - サブ項目1.1\n- リスト項目2\n\n1. 番号付きリスト\n2. 番号付きリスト\n\n> 引用文\n\n**太字** *斜体*"}
                  className="flex-1 px-6 py-5 text-sm leading-relaxed bg-card font-mono resize-none focus:outline-none placeholder:text-muted-foreground/30"
                  style={{ tabSize: 4 }}
                />
              </div>
            )}

            {/* Preview pane */}
            {(viewMode === "preview" || viewMode === "split") && (
              <div className={`flex flex-col ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
                <div className="bg-secondary/20 px-4 py-1.5 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground">プレビュー（公開時と同じ表示）</span>
                </div>
                <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6">
                  {title && (
                    <h1 className="text-2xl md:text-3xl font-serif font-bold mb-6 pb-4 border-b border-border">
                      {title}
                    </h1>
                  )}
                  <MarkdownPreview content={content} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="hidden lg:block w-64 border-l border-border p-4 space-y-4 shrink-0 overflow-y-auto">
          {/* Status */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium mb-3">ステータス</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setStatus("draft")}
                className={`flex-1 text-xs py-2 rounded-md font-medium transition-colors ${
                  status === "draft"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-secondary text-muted-foreground border border-border hover:bg-accent"
                }`}
              >
                下書き
              </button>
              <button
                onClick={() => setStatus("published")}
                className={`flex-1 text-xs py-2 rounded-md font-medium transition-colors ${
                  status === "published"
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-secondary text-muted-foreground border border-border hover:bg-accent"
                }`}
              >
                公開
              </button>
            </div>
          </div>

          {/* Markdown guide */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium mb-3">Markdown記法ガイド</h3>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p><code className="bg-muted px-1 py-0.5 rounded">## 見出し</code> → 見出し2</p>
              <p><code className="bg-muted px-1 py-0.5 rounded">### 見出し</code> → 見出し3</p>
              <p><code className="bg-muted px-1 py-0.5 rounded">**太字**</code> → <strong>太字</strong></p>
              <p><code className="bg-muted px-1 py-0.5 rounded">*斜体*</code> → <em>斜体</em></p>
              <p><code className="bg-muted px-1 py-0.5 rounded">- 項目</code> → 箇条書き</p>
              <p><code className="bg-muted px-1 py-0.5 rounded">{"    "}- 項目</code> → ネスト</p>
              <p><code className="bg-muted px-1 py-0.5 rounded">1. 項目</code> → 番号付き</p>
              <p><code className="bg-muted px-1 py-0.5 rounded">&gt; 引用</code> → 引用ブロック</p>
            </div>
          </div>

          {/* Internal comments */}
          {isEditing && (
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <MessageSquareText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">内部コメント</h3>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
                {internalComments.map((comment) => (
                  <div key={comment.id} className="bg-secondary/50 rounded-md p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-medium">{comment.user?.display_name || "不明"}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(comment.created_at).toLocaleDateString("ja-JP")}</span>
                    </div>
                    <p className="text-xs leading-relaxed">{comment.content}</p>
                  </div>
                ))}
                {internalComments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">内部コメントはまだありません。</p>
                )}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newInternalComment}
                  onChange={(e) => setNewInternalComment(e.target.value)}
                  placeholder="コメントを追加..."
                  className="flex-1 px-2 py-1.5 text-xs rounded-md border border-border bg-background"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddInternalComment(); }}
                />
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleAddInternalComment}>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
