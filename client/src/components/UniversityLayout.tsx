import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  Calendar, 
  ClipboardList, 
  FileText, 
  DollarSign, 
  UserPlus, 
  Settings,
  LayoutDashboard,
  LogOut,
  Globe,
  Menu,
  X
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function UniversityLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: () => {
      toast.error(t("error"));
    },
  });

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const navigationItems = [
    { icon: LayoutDashboard, label: t("dashboard"), path: "/dashboard" },
    { icon: BookOpen, label: t("academic"), path: "/academic/years" },
    { icon: GraduationCap, label: t("students"), path: "/students" },
    { icon: Users, label: t("instructors"), path: "/instructors" },
    { icon: ClipboardList, label: t("enrollment"), path: "/enrollments" },
    { icon: Calendar, label: t("attendance"), path: "/attendance" },
    { icon: FileText, label: t("examinations"), path: "/examinations" },
    { icon: FileText, label: t("grading"), path: "/grading" },
    { icon: UserPlus, label: t("admissions"), path: "/admissions" },
    { icon: DollarSign, label: t("finance"), path: "/finance" },
    { icon: Users, label: t("user_management"), path: "/users" },
    { icon: Settings, label: t("settings"), path: "/settings" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <aside 
        className={`
          ${sidebarOpen ? "w-64" : "w-0"} 
          transition-all duration-300 
          bg-card border-e border-border 
          flex flex-col
          overflow-hidden
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">{t("app_name")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("university_portal")}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || location.startsWith(item.path + "/");
            
            return (
              <Link key={item.path} href={item.path}>
                <a
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-colors
                    ${isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-foreground hover:bg-accent"
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || t("user_management")}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="flex-1"
            >
              <Globe className="w-4 h-4 me-2" />
              {language === "ar" ? "EN" : "ع"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="flex-1"
            >
              <LogOut className="w-4 h-4 me-2" />
              {t("logout")}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
