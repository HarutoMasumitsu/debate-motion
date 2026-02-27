import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  ArrowLeft,
  Save,
  Send,
  MessageSquareText,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useCategories } from "@/hooks/useArticles";
import { DEMO_ARTICLES } from "@/lib/demo-data";
import { toast } from "sonner";
import type { InternalComment } from "@/lib/types";

// Simple rich text editor with Markdown shortcuts
function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText =
      value.substring(0, start) +
      prefix +
      (selectedText || "テキスト") +
      suffix +
      value.substring(end);
    onChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + (selectedText || "テキスト").length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, label: "太字", action: () => insertMarkdown("**", "**") },
    { icon: Italic, label: "斜体", action: () => insertMarkdown("*", "*") },
    { icon: Heading2, label: "見出し2", action: () => insertMarkdown("\n## ") },
    { icon: Heading3, label: "見出し3", action: () => insertMarkdown("\n### ") },
    { icon: List, label: "箇条書き", action: () => insertMarkdown("\n- ") },
    { icon: ListOrdered, label: "番号付き", action: () => insertMarkdown("\n1. ") },
    { icon: Quote, label: "引用", action: () => insertMarkdown("\n> ") },
    { icon: Minus, label: "区切り線", action: () => insertMarkdown("\n---\n") },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Markdown shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") {
        e.preventDefault();
        insertMarkdown("**", "**");
      } else if (e.key === "i") {
        e.preventDefault();
        insertMarkdown("*", "*");
      }
    }

    // Auto-indent for lists
    if (e.key === "Enter") {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBefore = value.substring(0, cursorPos);
      const currentLine = textBefore.split("\n").pop() || "";

      const listMatch = currentLine.match(/^(\s*)([-*]|\d+\.)\s/);
      if (listMatch) {
        // If the current line is just the list marker with no content, remove it
        if (currentLine.trim() === listMatch[2]) {
          e.preventDefault();
          const lineStart = textBefore.lastIndexOf("\n") + 1;
          onChange(value.substring(0, lineStart) + "\n" + value.substring(cursorPos));
          setTimeout(() => {
            textarea.setSelectionRange(lineStart + 1, lineStart + 1);
          }, 0);
          return;
        }

        e.preventDefault();
        const indent = listMatch[1];
        let marker = listMatch[2];
        // Increment number for numbered lists
        const numMatch = marker.match(/^(\d+)\./);
        if (numMatch) {
          marker = `${parseInt(numMatch[1]) + 1}.`;
        }
        const insertion = `\n${indent}${marker} `;
        onChange(
          value.substring(0, cursorPos) + insertion + value.substring(cursorPos)
        );
        setTimeout(() => {
          const newPos = cursorPos + insertion.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
      }
    }

    // Tab for indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      onChange(value.substring(0, start) + "  " + value.substring(end));
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-muted/50 px-3 py-2 border-b border-border flex items-center gap-0.5 flex-wrap">
        {toolbarButtons.map((btn, i) => (
          <button
            key={i}
            type="button"
            onClick={btn.action}
            title={btn.label}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <btn.icon className="h-4 w-4" />
          </button>
        ))}
        <div className="ml-auto text-[10px] text-muted-foreground">
          Markdown記法対応 · Ctrl+B: 太字 · Ctrl+I: 斜体
        </div>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={24}
        className="w-full px-4 py-3 text-[15px] leading-relaxed bg-card outline-none resize-none font-sans"
        placeholder="ここに記事を書きます...&#10;&#10;## 見出しはMarkdown記法で入力できます&#10;&#10;- 箇条書きもサポート&#10;- **太字** や *斜体* も使えます"
        style={{ tabSize: 2 }}
      />
    </div>
  );
}

// Markdown to BlockNote JSON converter
function markdownToBlocks(markdown: string): any[] {
  const lines = markdown.split("\n");
  const blocks: any[] = [];
  let blockId = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") continue;

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***") {
      blocks.push({
        id: `block-${blockId++}`,
        type: "paragraph",
        content: [{ type: "text", text: "---" }],
      });
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push({
        id: `block-${blockId++}`,
        type: "heading",
        props: { level },
        content: parseInlineContent(headingMatch[2]),
      });
      continue;
    }

    // Blockquote
    const quoteMatch = line.match(/^>\s*(.*)/);
    if (quoteMatch) {
      blocks.push({
        id: `block-${blockId++}`,
        type: "paragraph",
        content: [{ type: "text", text: quoteMatch[1], styles: { italic: true } }],
      });
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^\s*[-*]\s+(.*)/);
    if (ulMatch) {
      blocks.push({
        id: `block-${blockId++}`,
        type: "bulletListItem",
        content: parseInlineContent(ulMatch[1]),
      });
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\s*\d+\.\s+(.*)/);
    if (olMatch) {
      blocks.push({
        id: `block-${blockId++}`,
        type: "numberedListItem",
        content: parseInlineContent(olMatch[1]),
      });
      continue;
    }

    // Regular paragraph
    blocks.push({
      id: `block-${blockId++}`,
      type: "paragraph",
      content: parseInlineContent(line),
    });
  }

  return blocks;
}

function parseInlineContent(text: string): any[] {
  const result: any[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        result.push({ type: "text", text: remaining.substring(0, boldMatch.index) });
      }
      result.push({ type: "text", text: boldMatch[1], styles: { bold: true } });
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) {
        result.push({ type: "text", text: remaining.substring(0, italicMatch.index) });
      }
      result.push({ type: "text", text: italicMatch[1], styles: { italic: true } });
      remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
      continue;
    }

    // Plain text
    result.push({ type: "text", text: remaining });
    break;
  }

  return result;
}

// BlockNote JSON to Markdown converter
function blocksToMarkdown(blocks: any[]): string {
  if (!Array.isArray(blocks)) return "";

  return blocks
    .map((block) => {
      const text = inlineContentToText(block.content);

      switch (block.type) {
        case "heading": {
          const level = block.props?.level || 2;
          return "#".repeat(level) + " " + text;
        }
        case "bulletListItem":
          return "- " + text;
        case "numberedListItem":
          return "1. " + text;
        default:
          return text;
      }
    })
    .join("\n\n");
}

function inlineContentToText(content: any[]): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (item.type === "text") {
        let text = item.text || "";
        if (item.styles?.bold) text = `**${text}**`;
        if (item.styles?.italic) text = `*${text}*`;
        return text;
      }
      if (item.type === "link") {
        return `[${inlineContentToText(item.content)}](${item.href})`;
      }
      return "";
    })
    .join("");
}

export default function ArticleEditor() {
  const params = useParams<{ id: string }>();
  const articleId = params.id;
  const isEditing = !!articleId;
  const [, navigate] = useLocation();
  const { profile, isAdmin } = useAuth();
  const { categories } = useCategories();
  const isDemoMode = !isSupabaseConfigured();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [markdownContent, setMarkdownContent] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [showPreview, setShowPreview] = useState(false);

  // Internal comments
  const [internalComments, setInternalComments] = useState<InternalComment[]>([]);
  const [newInternalComment, setNewInternalComment] = useState("");

  // Load article if editing
  useEffect(() => {
    if (!isEditing) return;

    if (isDemoMode) {
      const found = DEMO_ARTICLES.find((a) => a.id === articleId);
      if (found) {
        setTitle(found.title);
        setExcerpt(found.excerpt || "");
        setCategoryId(found.category_id || "");
        setThumbnailUrl(found.thumbnail_url || "");
        setMarkdownContent(blocksToMarkdown(found.content || []));
        setStatus(found.status);
      }
      setLoading(false);
      return;
    }

    supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single()
      .then(({ data, error }: any) => {
        if (error) {
          toast.error("記事の読み込みに失敗しました。");
          navigate("/admin");
          return;
        }
        if (data) {
          setTitle(data.title);
          setExcerpt(data.excerpt || "");
          setCategoryId(data.category_id || "");
          setThumbnailUrl(data.thumbnail_url || "");
          setMarkdownContent(blocksToMarkdown(data.content || []));
          setStatus(data.status);
        }
        setLoading(false);
      });

    // Load internal comments
    supabase
      .from("internal_comments")
      .select("*, user:profiles(*)")
      .eq("article_id", articleId)
      .order("created_at", { ascending: true })
      .then(({ data }: any) => {
        if (data) setInternalComments(data);
      });
  }, [articleId, isEditing, navigate, isDemoMode]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim() || `article-${Date.now()}`;
  };

  const handleSave = async (publishStatus?: "draft" | "published") => {
    if (!title.trim()) {
      toast.error("タイトルを入力してください。");
      return;
    }

    if (isDemoMode) {
      toast.info("デモモードでは保存できません。Supabaseを設定してください。");
      return;
    }

    setSaving(true);
    const finalStatus = publishStatus || status;
    const parsedContent = markdownToBlocks(markdownContent);

    const articleData = {
      title: title.trim(),
      slug: generateSlug(title),
      excerpt: excerpt.trim() || null,
      category_id: categoryId || null,
      thumbnail_url: thumbnailUrl || null,
      content: parsedContent,
      status: finalStatus,
      author_id: profile?.id,
      updated_at: new Date().toISOString(),
    };

    if (isEditing) {
      const { error } = await supabase
        .from("articles")
        .update(articleData)
        .eq("id", articleId);

      if (error) {
        toast.error("記事の更新に失敗しました: " + error.message);
      } else {
        toast.success("記事を保存しました。");
        setStatus(finalStatus);
      }
    } else {
      const { data, error } = await supabase
        .from("articles")
        .insert({ ...articleData, likes_count: 0 })
        .select()
        .single();

      if (error) {
        toast.error("記事の作成に失敗しました: " + error.message);
      } else {
        toast.success("記事を作成しました。");
        navigate(`/admin/editor/${data.id}`);
      }
    }

    setSaving(false);
  };

  const handleAddInternalComment = async () => {
    if (!newInternalComment.trim()) return;

    if (isDemoMode) {
      toast.info("デモモードでは内部コメントを追加できません。");
      return;
    }

    const { data, error } = await supabase
      .from("internal_comments")
      .insert({
        article_id: articleId,
        user_id: profile?.id,
        content: newInternalComment.trim(),
      })
      .select("*, user:profiles(*)")
      .single();

    if (error) {
      toast.error("コメントの追加に失敗しました。");
    } else {
      setInternalComments((prev) => [...prev, data]);
      setNewInternalComment("");
    }
  };

  // Simple markdown preview renderer
  const renderPreview = (md: string) => {
    const blocks = markdownToBlocks(md);
    return blocks.map((block, i) => {
      const text = inlineContentToText(block.content);
      switch (block.type) {
        case "heading":
          if (block.props?.level === 1) return <h1 key={i} className="text-2xl font-serif font-bold mt-6 mb-3">{text}</h1>;
          if (block.props?.level === 3) return <h3 key={i} className="text-lg font-serif font-semibold mt-4 mb-2">{text}</h3>;
          return <h2 key={i} className="text-xl font-serif font-semibold mt-5 mb-2">{text}</h2>;
        case "bulletListItem":
          return <li key={i} className="ml-5 list-disc mb-1">{text}</li>;
        case "numberedListItem":
          return <li key={i} className="ml-5 list-decimal mb-1">{text}</li>;
        default:
          return <p key={i} className="mb-3 leading-relaxed">{text}</p>;
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <Link href="/admin">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              管理画面に戻る
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {status === "published" ? "公開中" : "下書き"}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              {showPreview ? "編集" : "プレビュー"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              下書き保存
            </Button>

            {(isAdmin || isDemoMode) && (
              <Button
                size="sm"
                onClick={() => handleSave("published")}
                disabled={saving}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {status === "published" ? "更新" : "公開"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Editor area */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <input
            type="text"
            placeholder="Motionタイトルを入力..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl md:text-3xl font-serif font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 mb-4"
          />

          {/* Excerpt */}
          <textarea
            placeholder="記事の概要（検索結果やカード表示に使用されます）"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full text-sm bg-transparent border border-border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/40 mb-5 resize-none"
          />

          {/* Content editor or preview */}
          {showPreview ? (
            <div className="border border-border rounded-lg p-6 bg-card min-h-[500px]">
              <div className="prose-article">
                {renderPreview(markdownContent)}
                {!markdownContent.trim() && (
                  <p className="text-muted-foreground text-center py-12">
                    プレビューするコンテンツがありません。
                  </p>
                )}
              </div>
            </div>
          ) : (
            <RichTextEditor
              value={markdownContent}
              onChange={setMarkdownContent}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 hidden lg:block space-y-4">
          {/* Settings */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium mb-3">記事設定</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  カテゴリー
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded-md border border-border bg-background"
                >
                  <option value="">未分類</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  サムネイル画像URL
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background"
                />
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail preview"
                    className="mt-2 rounded-md w-full aspect-video object-cover"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Writing tips */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium mb-3">Markdown記法ガイド</h3>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p><code className="bg-muted px-1 py-0.5 rounded">## 見出し</code> → 見出し2</p>
              <p><code className="bg-muted px-1 py-0.5 rounded">### 見出し</code> → 見出し3</p>
              <p><code className="bg-muted px-1 py-0.5 rounded">**太字**</code> → <strong>太字</strong></p>
              <p><code className="bg-muted px-1 py-0.5 rounded">*斜体*</code> → <em>斜体</em></p>
              <p><code className="bg-muted px-1 py-0.5 rounded">- 項目</code> → 箇条書き</p>
              <p><code className="bg-muted px-1 py-0.5 rounded">1. 項目</code> → 番号付き</p>
              <p><code className="bg-muted px-1 py-0.5 rounded">&gt; 引用</code> → 引用ブロック</p>
            </div>
          </div>

          {/* Internal comments (review) */}
          {isEditing && (
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <MessageSquareText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">内部コメント</h3>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
                {internalComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-secondary/50 rounded-md p-2.5"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-medium">
                        {comment.user?.display_name || "不明"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">{comment.content}</p>
                  </div>
                ))}

                {internalComments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    内部コメントはまだありません。
                  </p>
                )}
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newInternalComment}
                  onChange={(e) => setNewInternalComment(e.target.value)}
                  placeholder="コメントを追加..."
                  className="flex-1 px-2 py-1.5 text-xs rounded-md border border-border bg-background"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddInternalComment();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleAddInternalComment}
                >
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
