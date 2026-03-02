// Database types for the debate motion site

export type UserRole = "admin" | "writer";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  content: any; // BlockNote JSON content or Markdown string
  excerpt: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  author_id: string;
  author_name: string | null; // Free-text author name (e.g. "益満・田中")
  status: "draft" | "published";
  likes_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  author?: Profile;
}

export interface Like {
  id: string;
  article_id: string;
  visitor_id: string; // anonymous visitor identifier
  created_at: string;
}

export interface PublicComment {
  id: string;
  article_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface InternalComment {
  id: string;
  article_id: string;
  block_id: string | null; // Reference to a specific block in the editor
  user_id: string;
  content: string;
  created_at: string;
  // Joined fields
  user?: Profile;
}
