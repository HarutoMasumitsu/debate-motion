import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCategories } from "@/hooks/useArticles";
import { motion } from "framer-motion";

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="aspect-[2/1] bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Link href={`/categories/${cat.slug}`}>
                  <div className="group relative rounded-lg overflow-hidden aspect-[2/1] cursor-pointer shadow-sm hover:shadow-lg transition-shadow duration-300">
                    {cat.image_url && (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h2 className="font-serif text-xl font-semibold text-white mb-1">
                        {cat.name}
                      </h2>
                      {cat.description && (
                        <p className="text-sm text-gray-200">{cat.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
