import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { Users, Loader2, Trash2 } from "lucide-react";
import type { DashboardOutletContext } from "@/types/dashboardOutletContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamInviteMemberDialog } from "@/components/TeamInviteMemberDialog";

type MemberRow = {
  id: string;
  member_user_id: string;
  member_email: string;
  created_at: string;
  account_created_at: string;
  last_sign_in_at: string | null;
  inviter_email: string | null;
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
      <div className="mx-auto max-w-3xl px-6 py-10 font-mono text-sm text-muted-foreground">
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
    <div className="mx-auto max-w-3xl px-6 py-10">
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

      <Card className="w-full p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="font-mono text-xs uppercase tracking-wider">Members</Label>
            <Button type="button" size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
              Add member
            </Button>
          </div>

          {loading ? (
            <p className="flex items-center gap-2 text-[10px] text-muted-foreground leading-snug">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              Loading team…
            </p>
          ) : members.length === 0 ? (
            <div
              className="rounded-md border border-border/80 bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground leading-snug"
              role="status"
            >
              <span className="font-medium text-foreground">No operators yet</span>
              {" — "}
              use Add member to invite someone who can run uploads and refunds for this brand.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/80 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Email
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Role
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Added to brand
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Account created
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Last sign-in
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Invited by
                    </TableHead>
                    <TableHead className="w-10 p-2 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id} className="border-b border-border/60 last:border-0">
                      <TableCell className="max-w-[200px] truncate font-mono text-[11px] text-foreground">
                        {m.member_email}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                        Operator
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
                        {fmtDate(m.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
                        {fmtDate(m.account_created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
                        {fmtDateTime(m.last_sign_in_at)}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate font-mono text-[11px] text-muted-foreground">
                        {m.inviter_email ?? "—"}
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={removingId === m.id}
                          onClick={() => void handleRemove(m)}
                          aria-label={`Remove ${m.member_email}`}
                        >
                          {removingId === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
