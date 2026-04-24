import { useState } from "react";
import { Loader2 } from "lucide-react";
import { inviteBrandTeamMember } from "@/lib/brand-team-invite";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_INITIAL_PASSWORD_LEN = 8;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onInvited: () => Promise<void>;
};

export function TeamInviteMemberDialog({ open, onOpenChange, brandId, onInvited }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [inviting, setInviting] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
  };

  const handleInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: "Enter an email", variant: "destructive" });
      return;
    }
    if (password.length < MIN_INITIAL_PASSWORD_LEN) {
      toast({
        title: "Password too short",
        description: `Use at least ${MIN_INITIAL_PASSWORD_LEN} characters for the initial sign-in password.`,
        variant: "destructive",
      });
      return;
    }
    if (password !== passwordConfirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      const res = await inviteBrandTeamMember(brandId, trimmed, password);
      if (!res.ok) {
        toast({ title: "Invite failed", description: res.error, variant: "destructive" });
        return;
      }
      const msg =
        res.status === "added"
          ? "That email already had an account; they were added to this brand."
          : res.status === "already_member"
            ? "That user already has access."
            : "New account created. They can sign in with this email and the password you set.";
      toast({ title: "Team updated", description: msg });
      resetForm();
      onOpenChange(false);
      await onInvited();
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Add team member</DialogTitle>
          <DialogDescription className="text-left font-mono text-xs leading-relaxed">
            Set an initial password they will use to sign in. If they already have an account on
            this app, the password you enter is ignored and only brand access is added.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="font-mono text-xs">
              Email address
            </Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-password" className="font-mono text-xs">
              Initial password (min {MIN_INITIAL_PASSWORD_LEN} characters)
            </Label>
            <Input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-password-confirm" className="font-mono text-xs">
              Confirm password
            </Label>
            <Input
              id="invite-password-confirm"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleInvite();
              }}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={
              inviting ||
              !email.trim() ||
              password.length < MIN_INITIAL_PASSWORD_LEN ||
              !passwordConfirm
            }
            onClick={() => void handleInvite()}
          >
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
