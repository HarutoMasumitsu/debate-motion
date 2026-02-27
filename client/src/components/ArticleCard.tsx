import { Link } from "wouter";
import { Heart, Calendar, Tag } from "lucide-react";
import type { Article } from "@/lib/types";
import { motion } from "framer-motion";

interface ArticleCardProps {
  article: Article;
  index?: number;
}

export default function ArticleCard({ article, index = 0 }: ArticleCardProps) {
  const formattedDate = new Date(article.created_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Link href={`/articles/${article.slug}`}>
        <article className="group bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
          {/* Thumbnail */}
          {article.thumbnail_url && (
            <div className="aspect-[16/9] overflow-hidden">
              <img
                src={article.thumbnail_url}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          )}

          <div className="p-5">
            {/* Category badge */}
            {article.category && (
              <div className="flex items-center gap-1.5 mb-2.5">
                <Tag className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">
                  {article.category.name}
                </span>
              </div>
            )}

            {/* Title */}
            <h3 className="font-serif text-base font-semibold leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h3>

            {/* Excerpt */}
            {article.excerpt && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                {article.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>{article.likes_count}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
