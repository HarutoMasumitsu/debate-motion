import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  Heart,
  Calendar,
  Clock,
  Tag,
  User,
  MessageCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useArticle, useComments, useLike } from "@/hooks/useArticles";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Render BlockNote content
function renderBlock(block: any): React.ReactNode {
  if (!block) return null;

  const renderInlineContent = (content: any[]): React.ReactNode => {
    if (!content) return null;
    return content.map((item: any, idx: number) => {
      if (item.type === "text") {
        let el: React.ReactNode = item.text;
        if (item.styles?.bold) el = <strong key={idx}>{el}</strong>;
        if (item.styles?.italic) el = <em key={idx}>{el}</em>;
        if (item.styles?.underline) el = <u key={idx}>{el}</u>;
        return <span key={idx}>{el}</span>;
      }
      if (item.type === "link") {
        return (
          <a
            key={idx}
            href={item.href}
            className="text-primary underline hover:text-primary/80"
            target="_blank"
            rel="noopener noreferrer"
          >
            {renderInlineContent(item.content)}
          </a>
        );
      }
      return null;
    });
  };

  switch (block.type) {
    case "paragraph":
      return (
        <p key={block.id} className="mb-4 leading-relaxed">
          {renderInlineContent(block.content)}
        </p>
      );
    case "heading": {
      const level = block.props?.level || 2;
      const className = `font-serif font-semibold ${
        level === 1
          ? "text-2xl mt-8 mb-4"
          : level === 2
          ? "text-xl mt-6 mb-3"
          : "text-lg mt-5 mb-2"
      }`;
      const content = renderInlineContent(block.content);
      if (level === 1) return <h1 key={block.id} className={className}>{content}</h1>;
      if (level === 3) return <h3 key={block.id} className={className}>{content}</h3>;
      return <h2 key={block.id} className={className}>{content}</h2>;
    }
    case "bulletListItem":
      return (
        <li key={block.id} className="mb-1 ml-5 list-disc">
          {renderInlineContent(block.content)}
        </li>
      );
    case "numberedListItem":
      return (
        <li key={block.id} className="mb-1 ml-5 list-decimal">
          {renderInlineContent(block.content)}
        </li>
      );
    default:
      if (block.content && Array.isArray(block.content)) {
        return (
          <div key={block.id} className="mb-4">
            {renderInlineContent(block.content)}
          </div>
        );
      }
      return null;
  }
}

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
            <div className="aspect-[16/9] bg-muted rounded-lg" />
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
                {article.author && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
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

              {/* Thumbnail */}
              {article.thumbnail_url && (
                <div className="rounded-lg overflow-hidden mb-8 shadow-sm">
                  <img
                    src={article.thumbnail_url}
                    alt={article.title}
                    className="w-full aspect-[16/9] object-cover"
                  />
                </div>
              )}

              {/* Article content */}
              <div className="prose-article">
                {Array.isArray(article.content) &&
                  article.content.map((block: any) => renderBlock(block))}
              </div>

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
