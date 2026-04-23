import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import type { DashboardOutletContext } from "@/types/dashboardOutletContext";
import {
  DollarSign,
  Package,
  Store,
  LogOut,
  ChevronsUpDown,
  Check,
  Building2,
  Plus,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ShopifyConnectionProvider } from "@/components/ShopifyConnectionProvider";
import { useDashboardBrands } from "@/hooks/useDashboardBrands";

const navItems = [
  { label: "Image Upload", to: "/image-upload", icon: Package },
  { label: "Refund", to: "/refund", icon: DollarSign },
  { label: "Shopify", to: "/shopify-settings", icon: Store },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [addBrandOpen, setAddBrandOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [creatingBrand, setCreatingBrand] = useState(false);
  const { brands, selectedBrand, selectBrand, createBrand, loading: brandsLoading } =
    useDashboardBrands();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate(`/auth?next=${encodeURIComponent(location.pathname)}`, { replace: true });
      } else {
        setChecked(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate(`/auth?next=${encodeURIComponent(location.pathname)}`, { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (!checked) return null;

  const handleCreateBrand = async () => {
    setCreatingBrand(true);
    try {
      const { error } = await createBrand(newBrandName);
      if (error) {
        toast({
          title: "Could not create brand",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      setAddBrandOpen(false);
      setNewBrandName("");
    } finally {
      setCreatingBrand(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="fixed top-4 left-4 bottom-4 w-52 flex flex-col rounded-2xl border bg-background shadow-lg z-10">
        <div className="px-4 py-4">
          <h1 className="font-mono font-semibold text-sm tracking-tight">Dashboard</h1>
        </div>

        <div className="px-2 pb-3 space-y-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={brandsLoading}
                className="w-full justify-between gap-2 font-mono text-xs rounded-xl h-9 px-3"
              >
                <span className="flex items-center gap-2 truncate">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {brandsLoading ? "Loading…" : selectedBrand?.name ?? "No brand"}
                  </span>
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
                  onClick={() => selectBrand(brand.id)}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      selectedBrand?.id === brand.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {brand.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="font-mono text-xs gap-2 cursor-pointer"
                onClick={() => setAddBrandOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                Add brand…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 font-mono text-xs text-muted-foreground rounded-xl h-8 px-2"
            onClick={() => setAddBrandOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            New brand
          </Button>
        </div>

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

      <main className="flex-1 ml-[232px] overflow-auto">
        <ShopifyConnectionProvider brandId={selectedBrand?.id ?? null}>
          <Outlet
            context={
              { importBrandId: selectedBrand?.id ?? null } satisfies DashboardOutletContext
            }
          />
        </ShopifyConnectionProvider>
      </main>

      <Dialog open={addBrandOpen} onOpenChange={setAddBrandOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">Add brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="brand-name" className="font-mono text-xs">
              Name
            </Label>
            <Input
              id="brand-name"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="e.g. GOSG Consulting"
              className="font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateBrand();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAddBrandOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={creatingBrand || !newBrandName.trim()}
              onClick={() => void handleCreateBrand()}
            >
              {creatingBrand ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
