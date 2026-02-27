import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, isWriter } = useAuth();
  const [, navigate] = useLocation();

  // In demo mode (Supabase not configured), allow access to admin pages
  const isDemoMode = !isSupabaseConfigured();

  useEffect(() => {
    if (!isDemoMode && !loading && (!user || !isWriter)) {
      navigate("/login");
    }
  }, [user, loading, isWriter, navigate, isDemoMode]);

  if (!isDemoMode && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">認証確認中...</div>
      </div>
    );
  }

  if (!isDemoMode && (!user || !isWriter)) {
    return null;
  }

  return <>{children}</>;
}
