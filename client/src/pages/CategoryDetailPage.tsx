import { useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { useArticles, useCategories } from "@/hooks/useArticles";

export default function CategoryDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const { categories } = useCategories();
  const category = categories.find((c) => c.slug === slug);
  const { articles, loading } = useArticles({ categorySlug: slug });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-10">
        <Link href="/categories">
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft className="h-3.5 w-3.5" />
            カテゴリー一覧に戻る
          </span>
        </Link>

        {category && (
          <div className="mb-8">
            <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-2">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </div>
        )}

        {loading ? (
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
                </div>
              </div>
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, i) => (
              <ArticleCard key={article.id} article={article} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              このカテゴリーにはまだ記事がありません。
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
