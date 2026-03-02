import { Link } from "wouter";
import { Calendar, Heart, Tag, Users } from "lucide-react";
import type { Article } from "@/lib/types";
import { DEFAULT_THUMBNAIL } from "@/lib/demo-data";
import { motion } from "framer-motion";

interface ArticleCardProps {
  article: Article;
  index?: number;
}

export default function ArticleCard({ article, index = 0 }: ArticleCardProps) {
  const createdDate = new Date(article.created_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const displayThumbnail = article.thumbnail_url || DEFAULT_THUMBNAIL;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link href={`/articles/${article.slug}`}>
        <article className="group bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer h-full flex flex-col">
          {/* Thumbnail - header style (compact) */}
          <div className="relative h-36 overflow-hidden">
            <img
              src={displayThumbnail}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {article.category && (
              <div className="absolute top-2 left-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-[11px] font-medium text-foreground">
                  <Tag className="h-2.5 w-2.5" />
                  {article.category.name}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col flex-1">
            <h3 className="font-serif font-semibold text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h3>

            {article.excerpt && (
              <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
                {article.excerpt}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                {/* Author name */}
                {article.author_name && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {article.author_name}
                  </span>
                )}
                {!article.author_name && article.author && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {article.author.display_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {createdDate}
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {article.likes_count}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
