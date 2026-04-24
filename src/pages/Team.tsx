import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { Users, Loader2, Trash2 } from "lucide-react";
import type { DashboardOutletContext } from "@/types/dashboardOutletContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { TeamInviteMemberDialog } from "@/components/TeamInviteMemberDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MemberRow = {
  id: string;
  member_user_id: string;
  member_email: string;
  created_at: string;
};

export default function Team() {
  const { importBrandId, selectedBrandIsOwner, refreshBrands } =
    useOutletContext<DashboardOutletContext>();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!importBrandId?.trim()) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("list_brand_team_members_for_owner", {
      p_brand_id: importBrandId.trim(),
    });
    if (error) {
      toast({
        title: "Could not load team",
        description: error.message,
        variant: "destructive",
      });
      setMembers([]);
    } else {
      setMembers((data ?? []) as MemberRow[]);
    }
    setLoading(false);
  }, [importBrandId, toast]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  if (!importBrandId) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 font-mono text-sm text-muted-foreground">
        Select a brand in the sidebar to manage team members.
      </div>
    );
  }

  if (!selectedBrandIsOwner) {
    return <Navigate to="/image-upload" replace />;
  }

  const handleRemove = async (row: MemberRow) => {
    setRemovingId(row.id);
    try {
      const { error } = await supabase.from("brand_members").delete().eq("id", row.id);
      if (error) {
        toast({ title: "Could not remove", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Access removed" });
      await loadMembers();
      await refreshBrands();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <TeamInviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        brandId={importBrandId}
        onInvited={async () => {
          await loadMembers();
          await refreshBrands();
        }}
      />
      <div className="flex items-center gap-3 mb-8">
        <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
          <Users className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-mono font-semibold tracking-tight">Team</h1>
          <p className="text-xs text-muted-foreground">
            Invite operators who can use Image Upload and Refund for this brand. They cannot
            change the Shopify connection or manage team members.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wide">
          Members
        </h2>
        <Button type="button" size="sm" variant="secondary" onClick={() => setInviteOpen(true)}>
          Add member
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground font-mono">No operators yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-xs">Email</TableHead>
              <TableHead className="font-mono text-xs w-[140px]">Since</TableHead>
              <TableHead className="font-mono text-xs w-[52px] text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-xs max-w-[200px] truncate">
                  {m.member_email}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(m.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    disabled={removingId === m.id}
                    onClick={() => void handleRemove(m)}
                    aria-label={`Remove ${m.member_email}`}
                  >
                    {removingId === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
