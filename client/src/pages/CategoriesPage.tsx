import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCategories } from "@/hooks/useArticles";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

export default function CategoriesPage() {
  const { categories, loading } = useCategories();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-10">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-2">
          カテゴリー
        </h1>
        <p className="text-muted-foreground mb-8">
          テーマ別にMotion解説を探す
        </p>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link href={`/categories/${cat.slug}`}>
                  <div className="group flex items-center gap-4 bg-card rounded-lg border border-border p-4 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer">
                    {/* Small thumbnail */}
                    {cat.image_url && (
                      <div className="w-16 h-16 rounded-md overflow-hidden shrink-0">
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    )}
                    {!cat.image_url && (
                      <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="font-serif text-xl font-bold text-primary">
                          {cat.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-serif text-lg font-semibold group-hover:text-primary transition-colors">
                        {cat.name}
                      </h2>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </Link>
              </motion.div>
            ))}

            {categories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">カテゴリーはまだありません。</p>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
