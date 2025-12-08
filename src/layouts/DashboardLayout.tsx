import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Truck, 
  Users, 
  Settings, 
  LogOut, 
  Store 
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { ThemeToggle } from "../components/ThemeToggle";
import { Toaster } from "../components/ui/sonner";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DashboardLayout() {
  const { user, profile, loading, signOut, isAdmin, isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
  
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out");
    navigate("/login");
  };

  const isDriver = profile?.role === 'driver';

  // Navigation Config
  const navItems = [
    { 
      icon: LayoutDashboard, 
      label: "Dashboard", 
      path: "/", 
      show: true // Everyone sees dashboard
    },
    { 
      icon: Package, 
      label: "Inventory", 
      path: "/inventory", 
      show: isAdmin || isManager // Drivers don't manage stock
    },
    { 
      icon: ShoppingCart, 
      label: "Orders", 
      path: "/orders", 
      show: isAdmin || isManager // Drivers work off the 'Logistics' sheet
    },
    { 
      icon: Truck, 
      label: "Logistics", 
      path: "/logistics", 
      show: isAdmin || isDriver // Managers don't manage the global run
    },
    { 
      icon: Users, 
      label: "Staff", 
      path: "/staff", 
      show: isAdmin // Only Super Admin adds staff
    },
    { 
      icon: Settings, 
      label: "Settings", 
      path: "/settings", 
      show: true // Everyone has settings
    },
  ];

  return (
    <div className="flex h-screen bg-muted/20 text-foreground font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border gap-2">
          <Store className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">DM Admin</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            item.show && (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 mb-1 font-normal", 
                    isActive(item.path) && "bg-secondary text-secondary-foreground font-medium"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          ))}
        </nav>

        {/* User Mini Profile & Logout */}
        <div className="p-4 border-t border-border bg-muted/10">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{profile?.role}</p>
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
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">
              {navItems.find(i => i.path === location.pathname)?.label || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:block text-sm text-muted-foreground">
               {profile?.assigned_location_id ? "Store View" : "Global View"}
             </div>
             <ThemeToggle />
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}