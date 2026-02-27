import { useState } from "react";
import { Link } from "wouter";
import { Search, ArrowRight, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { useArticles, useCategories } from "@/hooks/useArticles";
import { HERO_IMAGE } from "@/lib/demo-data";
import { motion } from "framer-motion";

export default function Home() {
  const [searchInput, setSearchInput] = useState("");
  const { articles: latestArticles, loading: latestLoading } = useArticles({
    sortBy: "latest",
    limit: 6,
  });
  const { articles: popularArticles, loading: popularLoading } = useArticles({
    sortBy: "popular",
    limit: 4,
  });
  const { categories } = useCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchInput.trim())}`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Hero background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>

        <div className="relative container py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              近代ディベート
              <br />
              <span className="text-amber-300">Motion</span>解説
            </h1>
            <p className="text-base md:text-lg text-gray-200 leading-relaxed mb-8 max-w-lg">
              ディベートのMotion（論題）を深く理解するための解説プラットフォーム。
              各テーマの背景知識から論点整理まで、体系的に学べます。
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Motionを検索..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/95 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button type="submit" className="px-5">
                検索
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      <main className="flex-1">
        {/* Categories Section */}
        <section className="container py-12 md:py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-xl md:text-2xl font-semibold">
              テーマ別カテゴリー
            </h2>
            <Link href="/categories">
              <span className="text-sm text-primary hover:underline flex items-center gap-1">
                すべて見る <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Link href={`/categories/${cat.slug}`}>
                  <div className="group relative rounded-lg overflow-hidden aspect-[2/1] cursor-pointer">
                    {cat.image_url && (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="font-serif text-lg font-semibold text-white mb-1">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="text-sm text-gray-200">{cat.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Latest Articles */}
        <section className="bg-secondary/30 py-12 md:py-16">
          <div className="container">
            <div className="flex items-center gap-2 mb-8">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl md:text-2xl font-semibold">
                新着記事
              </h2>
            </div>

            {latestLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-card rounded-lg border border-border animate-pulse"
                  >
                    <div className="aspect-[16/9] bg-muted" />
                    <div className="p-5 space-y-3">
                      <div className="h-3 bg-muted rounded w-16" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestArticles.map((article, i) => (
                  <ArticleCard key={article.id} article={article} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Popular Articles */}
        <section className="container py-12 md:py-16">
          <div className="flex items-center gap-2 mb-8">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            <h2 className="font-serif text-xl md:text-2xl font-semibold">
              人気記事
            </h2>
          </div>

          {popularLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-lg border border-border p-4 animate-pulse flex gap-4"
                >
                  <div className="w-20 h-20 bg-muted rounded shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {popularArticles.map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <Link href={`/articles/${article.slug}`}>
                    <div className="group flex gap-4 bg-card rounded-lg border border-border p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                      {article.thumbnail_url && (
                        <div className="w-24 h-24 rounded-md overflow-hidden shrink-0">
                          <img
                            src={article.thumbnail_url}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-primary">
                            {article.category?.name}
                          </span>
                          <span className="text-xs text-amber-600 font-medium">
                            ♥ {article.likes_count}
                          </span>
                        </div>
                        <h3 className="font-serif text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {article.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
