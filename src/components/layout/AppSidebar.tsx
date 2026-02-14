import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  School2,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const adminNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Approvals", icon: ClipboardCheck, path: "/approvals" },
  { label: "Users", icon: Users, path: "/users" },
  { label: "Classes", icon: School2, path: "/classes" },
  { label: "Subjects", icon: BookOpen, path: "/subjects" },
  { label: "Exams", icon: ClipboardList, path: "/exams" },
  { label: "Grading", icon: BookOpen, path: "/grading" },
  { label: "Report Cards", icon: ClipboardCheck, path: "/report-cards" },
  { label: "Attendance", icon: CalendarDays, path: "/attendance" },
  { label: "Timetable", icon: CalendarDays, path: "/timetable" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const teacherNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Exams", icon: ClipboardList, path: "/exams" },
  { label: "Report Cards", icon: ClipboardCheck, path: "/report-cards" },
  { label: "Attendance", icon: CalendarDays, path: "/attendance" },
  { label: "Timetable", icon: CalendarDays, path: "/timetable" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const studentNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Exams", icon: ClipboardList, path: "/exams" },
  { label: "Report Cards", icon: ClipboardCheck, path: "/report-cards" },
  { label: "Attendance", icon: CalendarDays, path: "/attendance" },
  { label: "Timetable", icon: CalendarDays, path: "/timetable" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const defaultNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export const AppSidebar = () => {
  const { role, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = role === "admin" ? adminNav : role === "teacher" ? teacherNav : role === "student" ? studentNav : defaultNav;

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
     <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
  
  {/* Favicon instead of Lucide icon */}
  <img
    src="/favicon.ico"
    alt="edVance Logo"
    className="h-7 w-7 shrink-0"
  />

  {!collapsed && (
    <span className="text-lg font-bold tracking-tight">edVance</span>
  )}

  <Button
    variant="ghost"
    size="icon"
    className="ml-auto h-7 w-7 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
    onClick={() => setCollapsed(!collapsed)}
  >
    {collapsed ? (
      <ChevronRight className="h-4 w-4" />
    ) : (
      <ChevronLeft className="h-4 w-4" />
    )}
  </Button>

</div>


      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={toggleTheme}
        >
          {theme === "light" ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
          {!collapsed && (theme === "light" ? "Dark Mode" : "Light Mode")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Sign Out"}
        </Button>
        {!collapsed && profile && (
          <div className="px-3 py-2 text-xs text-sidebar-muted truncate">
            {profile.full_name || profile.email}
          </div>
        )}
      </div>
    </aside>
  );
};
