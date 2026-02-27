import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import AuthGuard from "./components/AuthGuard";
import Home from "./pages/Home";
import SearchPage from "./pages/SearchPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryDetailPage from "./pages/CategoryDetailPage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ArticleEditor from "./pages/admin/ArticleEditor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/categories" component={CategoriesPage} />
      <Route path="/categories/:slug" component={CategoryDetailPage} />
      <Route path="/articles/:slug" component={ArticleDetailPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/admin">
        {() => (
          <AuthGuard>
            <AdminDashboard />
          </AuthGuard>
        )}
      </Route>
      <Route path="/admin/editor">
        {() => (
          <AuthGuard>
            <ArticleEditor />
          </AuthGuard>
        )}
      </Route>
      <Route path="/admin/editor/:id">
        {() => (
          <AuthGuard>
            <ArticleEditor />
          </AuthGuard>
        )}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
