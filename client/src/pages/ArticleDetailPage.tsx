import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  Heart,
  Calendar,
  Clock,
  Tag,
  Users,
  MessageCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useArticle, useComments, useLike } from "@/hooks/useArticles";
import { DEFAULT_THUMBNAIL } from "@/lib/demo-data";
import { motion } from "framer-motion";
import { toast } from "sonner";

// ===== Markdown Renderer with proper nested list support =====

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

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith("> ")) {
      let quoteContent = "";
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteContent += lines[i].trim().replace(/^>\s?/, "") + "\n";
        i++;
      }
      nodes.push({ type: "blockquote", content: quoteContent.trim() });
      continue;
    }

    // List (unordered or ordered) - collect all consecutive list lines
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const listNode = parseListBlock(lines, i);
      nodes.push(listNode.node);
      i = listNode.nextIndex;
      continue;
    }

    // Regular paragraph - collect until empty line or special block
    let paragraphContent = line;
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      if (
        nextLine.trim() === "" ||
        nextLine.match(/^#{1,6}\s/) ||
        nextLine.match(/^\s*([-*+]|\d+\.)\s/) ||
        nextLine.trim().startsWith("> ")
      ) {
        break;
      }
      paragraphContent += " " + nextLine;
      i++;
    }
    nodes.push({ type: "paragraph", content: paragraphContent });
  }

  return nodes;
}

function parseListBlock(
  lines: string[],
  startIndex: number
): { node: MarkdownNode; nextIndex: number } {
  // Determine if the first item is ordered or unordered
  const firstLine = lines[startIndex];
  const firstMatch = firstLine.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
  if (!firstMatch) {
    return { node: { type: "paragraph", content: firstLine }, nextIndex: startIndex + 1 };
  }

  const baseIndent = firstMatch[1].length;
  const isOrdered = /^\d+\./.test(firstMatch[2]);

  const items: MarkdownNode[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);

    if (!match) {
      // Not a list line - check if it's a continuation or end
      if (line.trim() === "") {
        // Check if next line continues the list
        if (i + 1 < lines.length && lines[i + 1].match(/^(\s*)([-*+]|\d+\.)\s/)) {
          i++;
          continue;
        }
        break;
      }
      break;
    }

    const indent = match[1].length;

    if (indent < baseIndent) {
      // This belongs to a parent list
      break;
    }

    if (indent === baseIndent) {
      // Same level item
      items.push({ type: "listItem", content: match[3] });
      i++;
    } else {
      // Deeper indent - this is a sub-list, parse recursively
      const subList = parseListBlock(lines, i);
      // Attach sub-list to the last item
      if (items.length > 0) {
        if (!items[items.length - 1].children) {
          items[items.length - 1].children = [];
        }
        items[items.length - 1].children!.push(subList.node);
      }
      i = subList.nextIndex;
    }
  }

  return {
    node: {
      type: "list",
      ordered: isOrdered,
      start: isOrdered ? parseInt(firstMatch[2]) : undefined,
      children: items,
    },
    nextIndex: i,
  };
}

function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Process inline formatting: bold, italic, inline code, links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Inline code
    const codeMatch = remaining.match(/`(.+?)`/);
    // Link
    const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);

    // Find earliest match
    const matches = [
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: "italic", match: italicMatch, index: italicMatch.index! } : null,
      codeMatch ? { type: "code", match: codeMatch, index: codeMatch.index! } : null,
      linkMatch ? { type: "link", match: linkMatch, index: linkMatch.index! } : null,
    ].filter(Boolean) as { type: string; match: RegExpMatchArray; index: number }[];

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    matches.sort((a, b) => a.index - b.index);
    const earliest = matches[0];

    // Add text before the match
    if (earliest.index > 0) {
      parts.push(remaining.substring(0, earliest.index));
    }

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
        parts.push(
          <code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
            {earliest.match[1]}
          </code>
        );
        remaining = remaining.substring(earliest.index + earliest.match[0].length);
        break;
      case "link":
        parts.push(
          <a
            key={key++}
            href={earliest.match[2]}
            className="text-primary underline hover:text-primary/80"
            target="_blank"
            rel="noopener noreferrer"
          >
            {earliest.match[1]}
          </a>
        );
        remaining = remaining.substring(earliest.index + earliest.match[0].length);
        break;
    }
  }

  return <>{parts}</>;
}

function MarkdownContent({ content }: { content: string }) {
  const nodes = parseMarkdown(content);

  return <div className="prose-article">{nodes.map((node, i) => renderNode(node, i))}</div>;
}

function renderNode(node: MarkdownNode, key: number): React.ReactNode {
  switch (node.type) {
    case "heading": {
      const className = `font-serif font-semibold ${
        node.level === 1
          ? "text-2xl mt-8 mb-4"
          : node.level === 2
          ? "text-xl mt-6 mb-3"
          : "text-lg mt-5 mb-2"
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
      return (
        <p key={key} className="mb-4 leading-relaxed">
          {renderInlineMarkdown(node.content || "")}
        </p>
      );

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-4 border-primary/30 pl-4 py-1 my-4 text-muted-foreground italic"
        >
          {renderInlineMarkdown(node.content || "")}
        </blockquote>
      );

    case "list": {
      const ListTag = node.ordered ? "ol" : "ul";
      const listClass = node.ordered
        ? "list-decimal pl-6 mb-4 space-y-1"
        : "list-disc pl-6 mb-4 space-y-1";
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

// ===== Main Component =====

export default function ArticleDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { article, loading } = useArticle(slug);
  const { comments, addComment } = useComments(article?.id || "");
  const { liked, likesCount, toggleLike } = useLike(article?.id || "");

  const [commentName, setCommentName] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentContent.trim()) {
      toast.error("名前とコメント内容を入力してください。");
      return;
    }
    setSubmitting(true);
    const { error } = await addComment(commentName.trim(), commentContent.trim());
    if (error) {
      toast.error("コメントの投稿に失敗しました。");
    } else {
      toast.success("コメントを投稿しました。");
      setCommentName("");
      setCommentContent("");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-10">
          <div className="max-w-3xl mx-auto animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-48 bg-muted rounded-lg" />
            <div className="space-y-3 pt-4">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-5/6" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-10 text-center">
          <p className="text-muted-foreground text-lg">記事が見つかりませんでした。</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              ホームに戻る
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const createdDate = new Date(article.created_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const updatedDate = new Date(article.updated_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const displayThumbnail = article.thumbnail_url || DEFAULT_THUMBNAIL;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Article header */}
        <div className="container py-8">
          <div className="max-w-3xl mx-auto">
            <Link href="/">
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
                <ArrowLeft className="h-3.5 w-3.5" />
                ホームに戻る
              </span>
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Category */}
              {article.category && (
                <Link href={`/categories/${article.category.slug}`}>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mb-3 hover:underline">
                    <Tag className="h-3 w-3" />
                    {article.category.name}
                  </span>
                </Link>
              )}

              {/* Title */}
              <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-4">
                {article.title}
              </h1>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                {article.author_name && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>{article.author_name}</span>
                  </div>
                )}
                {!article.author_name && article.author && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>{article.author.display_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{createdDate}</span>
                </div>
                {article.updated_at !== article.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>更新: {updatedDate}</span>
                  </div>
                )}
              </div>

              {/* Thumbnail - header style (shorter height) */}
              <div className="rounded-lg overflow-hidden mb-8 shadow-sm">
                <img
                  src={displayThumbnail}
                  alt={article.title}
                  className="w-full h-48 md:h-56 object-cover"
                />
              </div>

              {/* Article content */}
              {typeof article.content === "string" ? (
                <MarkdownContent content={article.content} />
              ) : Array.isArray(article.content) ? (
                <div className="prose-article">
                  <p className="text-muted-foreground">コンテンツの表示に対応していない形式です。</p>
                </div>
              ) : null}

              {/* Like button */}
              <div className="flex items-center justify-center mt-10 mb-8 pt-8 border-t border-border">
                <button
                  onClick={toggleLike}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full border transition-all duration-300 ${
                    liked
                      ? "bg-red-50 border-red-200 text-red-600"
                      : "bg-card border-border text-muted-foreground hover:border-red-200 hover:text-red-500"
                  }`}
                >
                  <Heart
                    className={`h-5 w-5 transition-all duration-300 ${
                      liked ? "fill-red-500 text-red-500 scale-110" : ""
                    }`}
                  />
                  <span className="font-medium text-sm">
                    {liked ? "いいね済み" : "いいね"}
                  </span>
                  <span className="text-sm font-semibold">{likesCount}</span>
                </button>
              </div>

              {/* Comments section */}
              <section className="mt-8 pt-8 border-t border-border">
                <div className="flex items-center gap-2 mb-6">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <h2 className="font-serif text-xl font-semibold">
                    コメント ({comments.length})
                  </h2>
                </div>

                {/* Comment form */}
                <form
                  onSubmit={handleSubmitComment}
                  className="bg-secondary/30 rounded-lg p-5 mb-6"
                >
                  <h3 className="text-sm font-medium mb-3">コメントを投稿</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="お名前"
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      maxLength={50}
                    />
                    <textarea
                      placeholder="コメント内容"
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      maxLength={500}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submitting}
                        className="gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {submitting ? "投稿中..." : "投稿する"}
                      </Button>
                    </div>
                  </div>
                </form>

                {/* Comments list */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-card rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {comment.author_name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {comment.author_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90 pl-9">
                        {comment.content}
                      </p>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-6">
                      まだコメントはありません。最初のコメントを投稿しましょう。
                    </p>
                  )}
                </div>
              </section>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
