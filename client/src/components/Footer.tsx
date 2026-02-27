import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30 mt-auto">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs font-sans">M</span>
              </div>
              <span className="font-serif text-base font-semibold">
                近代ディベートMotion解説
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ディベートのMotion（論題）を深く理解するための解説プラットフォーム。
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-serif font-semibold text-sm mb-3">ナビゲーション</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  ホーム
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-primary transition-colors">
                  カテゴリー
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-primary transition-colors">
                  検索
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-serif font-semibold text-sm mb-3">管理者向け</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  ログイン
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} 近代ディベートMotion解説. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
