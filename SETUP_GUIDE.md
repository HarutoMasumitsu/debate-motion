# 近代ディベートMotion解説 — セットアップガイド

このガイドでは、「近代ディベートMotion解説」サイトをSupabaseとVercelを使って本番環境にデプロイするまでの手順を説明します。すべて無料枠の範囲内で運用可能です。

---

## 1. Supabaseプロジェクトの作成

### 1-1. アカウント作成

[Supabase公式サイト](https://supabase.com) にアクセスし、「Start your project」をクリックします。GitHubアカウントでのサインアップが最も簡単です。

### 1-2. 新規プロジェクト作成

ログイン後、ダッシュボードから「New Project」をクリックし、以下の情報を入力します。

| 項目 | 入力内容 |
|------|---------|
| Organization | 自分の組織名（初回は自動作成されます） |
| Project name | `debate-motion`（任意の名前） |
| Database Password | 安全なパスワードを設定（後で使うのでメモしてください） |
| Region | `Northeast Asia (Tokyo)` を推奨 |
| Pricing Plan | Free を選択 |

「Create new project」をクリックすると、数分でプロジェクトが作成されます。

### 1-3. APIキーの取得

プロジェクトが作成されたら、左メニューの **Settings → API** に移動します。以下の2つの値をメモしてください。

| 項目 | 説明 |
|------|------|
| Project URL | `https://xxxxx.supabase.co` 形式のURL |
| anon (public) key | `eyJhbGciOi...` で始まる長い文字列 |

これらは後ほどVercelの環境変数として設定します。

---

## 2. データベースのセットアップ

### 2-1. SQLエディタでテーブルを作成

Supabaseダッシュボードの左メニューから **SQL Editor** を開き、以下のSQLを実行してください。「New query」をクリックし、下記を貼り付けて「Run」を押します。

```sql
-- ========================================
-- 1. プロフィールテーブル（ユーザー管理）
-- ========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '名前未設定',
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'writer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 2. カテゴリーテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 3. 記事テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content JSONB DEFAULT '[]'::jsonb,
  excerpt TEXT,
  thumbnail_url TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 4. いいねテーブル（重複防止用）
-- ========================================
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, ip_hash)
);

-- ========================================
-- 5. 一般コメントテーブル（閲覧者用）
-- ========================================
CREATE TABLE IF NOT EXISTS public_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 6. 内部コメントテーブル（管理者間レビュー用）
-- ========================================
CREATE TABLE IF NOT EXISTS internal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  block_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 7. いいねカウント更新用の関数
-- ========================================
CREATE OR REPLACE FUNCTION increment_likes(article_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE articles SET likes_count = likes_count + 1 WHERE id = article_id_input;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. 新規ユーザー登録時にプロフィールを自動作成するトリガー
-- ========================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'writer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================================
-- 9. 初期カテゴリーデータ
-- ========================================
INSERT INTO categories (name, slug, description) VALUES
  ('Religion', 'religion', '宗教・信仰に関するMotion'),
  ('Economy', 'economy', '経済・財政に関するMotion'),
  ('Choice', 'choice', '個人の選択・自律性に関するMotion')
ON CONFLICT (slug) DO NOTHING;
```

### 2-2. Row Level Security (RLS) の設定

続けて、同じSQLエディタで以下のSQLを実行してください。これにより、データへのアクセス権限が適切に制御されます。

```sql
-- ========================================
-- RLS（行レベルセキュリティ）の有効化とポリシー設定
-- ========================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- articles
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published articles are viewable by everyone" ON articles FOR SELECT USING (
  status = 'published' OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('writer', 'admin'))
);
CREATE POLICY "Writers can create articles" ON articles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('writer', 'admin'))
);
CREATE POLICY "Writers can update own articles" ON articles FOR UPDATE USING (
  author_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete articles" ON articles FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert likes" ON likes FOR INSERT WITH CHECK (true);

-- public_comments
ALTER TABLE public_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON public_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can post comments" ON public_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can delete comments" ON public_comments FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- internal_comments
ALTER TABLE internal_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Writers and admins can view internal comments" ON internal_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('writer', 'admin'))
);
CREATE POLICY "Writers and admins can create internal comments" ON internal_comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('writer', 'admin'))
);
```

---

## 3. 管理者アカウントの作成

### 3-1. ユーザーの作成

Supabaseダッシュボードの左メニューから **Authentication → Users** に移動し、「Add user」→「Create new user」をクリックします。

| 項目 | 入力内容 |
|------|---------|
| Email | 管理者のメールアドレス |
| Password | 安全なパスワード |
| Auto Confirm User | チェックを入れる |

### 3-2. 管理者権限の付与

ユーザーが作成されたら、左メニューの **Table Editor → profiles** テーブルを開きます。作成したユーザーの行を見つけ、`role` カラムをクリックして `admin` に変更し、保存します。

追加の執筆者を招待する場合も同様の手順で、`role` を `writer` に設定してください。

---

## 4. Vercelへのデプロイ

### 4-1. GitHubリポジトリの準備

まず、プロジェクトのコードをGitHubリポジトリにアップロードする必要があります。GitHubアカウントをお持ちでない場合は、[github.com](https://github.com) で作成してください。

### 4-2. Vercelアカウント作成とプロジェクトのインポート

[Vercel](https://vercel.com) にアクセスし、GitHubアカウントでサインアップします。ログイン後、「Add New → Project」をクリックし、先ほどのGitHubリポジトリをインポートします。

### 4-3. ビルド設定

インポート画面で以下の設定を行います。

| 項目 | 設定値 |
|------|--------|
| Framework Preset | Vite |
| Build Command | `pnpm build` |
| Output Directory | `dist/public` |
| Install Command | `pnpm install` |

### 4-4. 環境変数の設定

「Environment Variables」セクションで、以下の2つの変数を追加します。

| 変数名 | 値 |
|--------|-----|
| `VITE_SUPABASE_URL` | Supabaseの Project URL（手順1-3でメモしたもの） |
| `VITE_SUPABASE_ANON_KEY` | Supabaseの anon key（手順1-3でメモしたもの） |

すべて入力したら「Deploy」をクリックします。数分でデプロイが完了し、`https://your-project.vercel.app` のURLでサイトにアクセスできるようになります。

---

## 5. デプロイ後の確認

デプロイが完了したら、以下の項目を確認してください。

1. トップページが正常に表示されること
2. `/login` ページで管理者アカウントでログインできること
3. `/admin` ページで管理画面にアクセスできること
4. 記事の作成・編集・公開が正常に動作すること
5. 閲覧者がコメントやいいねを投稿できること

---

## 6. 運用のヒント

### カテゴリーの追加

新しいカテゴリーを追加するには、Supabaseダッシュボードの **Table Editor → categories** テーブルで直接行を追加してください。`name`（表示名）、`slug`（URL用の英字識別子）、`description`（説明文）を入力します。

### 執筆者の追加

新しい執筆者を追加するには、手順3と同じ方法でSupabaseの Authentication からユーザーを作成し、profiles テーブルで `role` を `writer` に設定します。

### カスタムドメインの設定

Vercelダッシュボードの **Settings → Domains** から、独自ドメインを設定できます。無料プランでも利用可能です。

---

## トラブルシューティング

| 症状 | 原因と対処法 |
|------|-------------|
| ログインできない | Supabaseの Authentication → Users でユーザーが存在するか確認。Auto Confirm が有効か確認。 |
| 記事が保存できない | RLSポリシーが正しく設定されているか確認。profiles テーブルの role が正しいか確認。 |
| 画面が真っ白 | ブラウザの開発者ツール（F12）でエラーを確認。環境変数が正しく設定されているか確認。 |
| デモモードのまま | Vercelの環境変数 `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` が設定されているか確認。再デプロイが必要な場合があります。 |
