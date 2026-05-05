import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Loader2, KeyRound, RefreshCw, Users as UsersIcon } from "lucide-react";
import type { DashboardOutletContext } from "@/types/dashboardOutletContext";
import { listBrandUsers, type BrandUserRow } from "@/lib/brand-users";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UsersAccessDialog } from "@/components/UsersAccessDialog";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function displayName(row: BrandUserRow): string {
  const parts = [row.first_name, row.last_name].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" ") : row.email;
}

export default function Users() {
  const { importBrandId } = useOutletContext<DashboardOutletContext>();
  const { toast } = useToast();
  const [users, setUsers] = useState<BrandUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!importBrandId) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const res = await listBrandUsers(importBrandId);
      if (!res.ok) {
        toast({ title: "Could not load users", description: res.error, variant: "destructive" });
        setUsers([]);
        return;
      }
      setUsers(res.users);
    } finally {
      setLoading(false);
    }
  }, [importBrandId, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
            <UsersIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-mono font-semibold tracking-tight">Users</h1>
            <p className="text-xs text-muted-foreground">
              Brand-scoped users in <span className="font-mono">brand_users</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void reload()}
            disabled={loading || !importBrandId}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span className="ml-2 font-mono text-xs">Refresh</span>
          </Button>
          <Button size="sm" onClick={() => setAccessOpen(true)} disabled={!importBrandId}>
            <KeyRound className="h-3.5 w-3.5" />
            <span className="ml-2 font-mono text-xs">Access</span>
          </Button>
        </div>
      </div>

      {!importBrandId ? (
        <Card className="max-w-xl p-6">
          <p className="font-mono text-sm">Select a brand to manage its users.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/40 border-b">
              <tr className="font-mono text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Active</th>
                <th className="px-4 py-2 font-medium">Last login</th>
                <th className="px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                    No users yet. Click "Access" to add one.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2 font-mono text-xs">{displayName(u)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {u.admin_role ? `${u.role} · ${u.admin_role}` : u.role}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {u.is_active ? "yes" : "no"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{formatDate(u.last_login_at)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{formatDate(u.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {importBrandId ? (
        <UsersAccessDialog
          open={accessOpen}
          onOpenChange={setAccessOpen}
          brandId={importBrandId}
          currentUsers={users}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}
