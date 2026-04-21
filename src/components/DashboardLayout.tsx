import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { DollarSign, Package, LogOut, ChevronsUpDown, Check, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Image Upload", to: "/image-upload", icon: Package },
  { label: "Refund", to: "/refund", icon: DollarSign },
];

const brands = [
  { id: "jiji", label: "JIJI Studio" },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(brands[0]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate(`/auth?next=${encodeURIComponent(location.pathname)}`, { replace: true });
      } else {
        setChecked(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate(`/auth?next=${encodeURIComponent(location.pathname)}`, { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (!checked) return null;

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Fixed bubble sidebar */}
      <aside className="fixed top-4 left-4 bottom-4 w-52 flex flex-col rounded-2xl border bg-background shadow-lg z-10">
        <div className="px-4 py-4">
          <h1 className="font-mono font-semibold text-sm tracking-tight">Dashboard</h1>
        </div>

        {/* Brand selector */}
        <div className="px-2 pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between gap-2 font-mono text-xs rounded-xl h-9 px-3"
              >
                <span className="flex items-center gap-2 truncate">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{selectedBrand.label}</span>
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="font-mono text-xs text-muted-foreground">
                Brands
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {brands.map((brand) => (
                <DropdownMenuItem
                  key={brand.id}
                  className="font-mono text-xs gap-2 cursor-pointer"
                  onClick={() => setSelectedBrand(brand)}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      selectedBrand.id === brand.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {brand.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-mono transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 font-mono text-xs text-muted-foreground rounded-xl"
            onClick={() => void supabase.auth.signOut().then(() => navigate("/auth"))}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Content offset to clear the fixed sidebar */}
      <main className="flex-1 ml-[232px] overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
