import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { ThemeToggle } from "../components/ThemeToggle";
import { Toaster } from "../components/ui/sonner";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { useState } from "react";
import Logo from "../assets/logo.svg";

// 1. Define interfaces outside
interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  show: boolean;
}

interface NavLinksProps {
  items: NavItem[];
  currentPath: string;
  onLinkClick?: () => void;
}

// 2. Component defined OUTSIDE to enable Fast Refresh
const NavLinks = ({ items, currentPath, onLinkClick }: NavLinksProps) => {
  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <div className="space-y-1">
      {items.map(
        (item) =>
          item.show && (
            <Link key={item.path} to={item.path} onClick={onLinkClick}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 mb-1 font-normal",
                  isActive(item.path) &&
                    "bg-secondary text-secondary-foreground font-medium"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          )
      )}
    </div>
  );
};

export default function DashboardLayout() {
  const { user, profile, loading, signOut, isAdmin, isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out");
    navigate("/login");
  };

  const isDriver = profile?.role === "driver";

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/", show: true },
    {
      icon: Package,
      label: "Inventory",
      path: "/inventory",
      show: isAdmin || isManager,
    },
    {
      icon: ShoppingCart,
      label: "Orders",
      path: "/orders",
      show: isAdmin || isManager,
    },
    {
      icon: Truck,
      label: "Logistics",
      path: "/logistics",
      show: isAdmin || isDriver,
    },
    { icon: Users, label: "Staff", path: "/staff", show: isAdmin },
    { icon: Settings, label: "Settings", path: "/settings", show: true },
  ];

  // Mobile Bottom Nav specific items
  const bottomNavItems = navItems.filter((item) => item.show).slice(0, 4);

  return (
    <div className="flex h-screen bg-muted/20 text-foreground font-sans">
      {/* DESKTOP SIDEBAR */}
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border gap-2">
          <img src={Logo} className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">Splaza Admin</span>
        </div>

        <nav className="flex-1 p-4">
          <NavLinks items={navItems} currentPath={location.pathname} />
        </nav>

        <div className="p-4 border-t border-border bg-muted/10">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {profile?.role}
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">
              {navItems.find((i) => i.path === location.pathname)?.label ||
                "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-sm text-muted-foreground">
              {profile?.assigned_location_id ? "Store View" : "Global View"}
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {bottomNavItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", active && "fill-current/20")}
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Mobile "More" Menu */}
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground hover:text-foreground">
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-medium">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-[10px]">
              <SheetHeader className="text-left mb-4">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="space-y-1">
                <NavLinks
                  items={navItems}
                  currentPath={location.pathname}
                  onLinkClick={() => setIsMobileOpen(false)}
                />
              </div>
              <div className="mt-8 pt-8 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {profile?.role}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Log Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Toaster />
    </div>
  );
}
