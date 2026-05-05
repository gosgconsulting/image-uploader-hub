import { useEffect, useMemo, useState } from "react";
import { Loader2, ArrowRight, Check } from "lucide-react";
import {
  createBrandUser,
  generateBrandUserSignupLink,
  grantBrandAccess,
  listBrandUserRoles,
  listKnownEmails,
  type BrandUserRow,
  type KnownEmailRow,
} from "@/lib/brand-users";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MIN_INITIAL_PASSWORD_LEN = 8;
const DEFAULT_ROLES = ["user", "admin"];

type Step = "create" | "access";

type CreateMode = "password" | "link";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  currentUsers: BrandUserRow[];
  onChanged: () => Promise<void>;
};

export function UsersAccessDialog({
  open,
  onOpenChange,
  brandId,
  currentUsers,
  onChanged,
}: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("create");

  // Step 1 state
  const [mode, setMode] = useState<CreateMode>("password");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("user");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Roles & known emails
  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES);
  const [knownEmails, setKnownEmails] = useState<KnownEmailRow[]>([]);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantRole, setGrantRole] = useState("user");
  const [busy, setBusy] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const reset = () => {
    setStep("create");
    setMode("password");
    setEmail("");
    setFirstName("");
    setLastName("");
    setRole("user");
    setPassword("");
    setPasswordConfirm("");
    setGeneratedLink(null);
    setGrantEmail("");
    setGrantRole("user");
  };

  const handleClose = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  // Load roles + known emails when the dialog opens.
  useEffect(() => {
    if (!open || !brandId) return;
    let cancelled = false;
    setLoadingMeta(true);
    void Promise.all([listBrandUserRoles(brandId), listKnownEmails(brandId)]).then(
      ([rolesRes, emailsRes]) => {
        if (cancelled) return;
        if (rolesRes.ok && rolesRes.roles.length > 0) {
          setRoles(rolesRes.roles);
          if (!rolesRes.roles.includes(role)) setRole(rolesRes.roles[0]);
          if (!rolesRes.roles.includes(grantRole)) setGrantRole(rolesRes.roles[0]);
        }
        if (emailsRes.ok) setKnownEmails(emailsRes.emails);
        setLoadingMeta(false);
      },
    );
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, brandId]);

  // Emails known to the owner that don't yet have access to this brand.
  const candidateEmails = useMemo(() => {
    const inThisBrand = new Set(currentUsers.map((u) => u.email.toLowerCase()));
    const seen = new Set<string>();
    const out: { email: string; brands: string[] }[] = [];
    for (const e of knownEmails) {
      const lower = e.email.toLowerCase();
      if (inThisBrand.has(lower)) continue;
      if (seen.has(lower)) {
        const existing = out.find((o) => o.email.toLowerCase() === lower);
        if (existing && e.brand_name && !existing.brands.includes(e.brand_name)) {
          existing.brands.push(e.brand_name);
        }
        continue;
      }
      seen.add(lower);
      out.push({ email: e.email, brands: e.brand_name ? [e.brand_name] : [] });
    }
    return out.sort((a, b) => a.email.localeCompare(b.email));
  }, [knownEmails, currentUsers]);

  const handleCreate = async () => {
    const trimmed = email.trim();
    if (!trimmed) return toast({ title: "Enter an email", variant: "destructive" });
    if (password.length < MIN_INITIAL_PASSWORD_LEN) {
      return toast({
        title: "Password too short",
        description: `Use at least ${MIN_INITIAL_PASSWORD_LEN} characters.`,
        variant: "destructive",
      });
    }
    if (password !== passwordConfirm) {
      return toast({ title: "Passwords do not match", variant: "destructive" });
    }
    setBusy(true);
    try {
      const res = await createBrandUser({
        brandId,
        email: trimmed,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        role,
      });
      if (!res.ok) {
        return toast({ title: "Could not create user", description: res.error, variant: "destructive" });
      }
      toast({
        title: "User created",
        description:
          res.status === "created"
            ? "New account created."
            : res.status === "added"
              ? "Existing account added to this brand."
              : "User already had access.",
      });
      await onChanged();
      setStep("access");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) return toast({ title: "Enter an email", variant: "destructive" });
    setBusy(true);
    try {
      const res = await generateBrandUserSignupLink({ brandId, email: trimmed, role });
      if (!res.ok) {
        return toast({ title: "Could not generate link", description: res.error, variant: "destructive" });
      }
      setGeneratedLink(res.action_link);
      try {
        await navigator.clipboard.writeText(res.action_link);
        toast({ title: "Link copied to clipboard" });
      } catch {
        toast({ title: "Link generated", description: "Copy it from the field below." });
      }
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const handleGrantAccess = async () => {
    const trimmed = grantEmail.trim();
    if (!trimmed) return toast({ title: "Pick an email", variant: "destructive" });
    setBusy(true);
    try {
      const res = await grantBrandAccess({ brandId, email: trimmed, role: grantRole });
      if (!res.ok) {
        return toast({ title: "Could not grant access", description: res.error, variant: "destructive" });
      }
      toast({
        title: "Access granted",
        description:
          res.status === "added" ? "User now has access to this brand." : "User already had access.",
      });
      setGrantEmail("");
      await onChanged();
      // Refresh known emails list so the newly-granted user disappears from the dropdown.
      const emailsRes = await listKnownEmails(brandId);
      if (emailsRes.ok) setKnownEmails(emailsRes.emails);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono">Access</DialogTitle>
          <DialogDescription className="text-left font-mono text-xs leading-relaxed">
            Step 1 — create a new user (or skip). Step 2 — grant brand access to existing users.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <StepChip num={1} label="Create User" active={step === "create"} done={step === "access"} />
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <StepChip num={2} label="Provide Access" active={step === "access"} done={false} />
        </div>

        {step === "create" ? (
          <div className="space-y-3 py-1">
            <div className="flex gap-1 p-1 bg-muted rounded-md">
              <button
                type="button"
                className={cn(
                  "flex-1 text-xs font-mono py-1.5 rounded",
                  mode === "password" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
                onClick={() => setMode("password")}
              >
                Set password
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 text-xs font-mono py-1.5 rounded",
                  mode === "link" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
                onClick={() => setMode("link")}
              >
                Sign-up link
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="users-email" className="font-mono text-xs">Email</Label>
              <Input
                id="users-email"
                type="email"
                autoComplete="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="users-first" className="font-mono text-xs">First name</Label>
                <Input
                  id="users-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="users-last" className="font-mono text-xs">Last name</Label>
                <Input
                  id="users-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-mono text-xs">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="font-mono text-sm h-9">
                  <SelectValue placeholder="Pick a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r} className="font-mono text-sm">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === "password" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="users-password" className="font-mono text-xs">
                    Initial password (min {MIN_INITIAL_PASSWORD_LEN} characters)
                  </Label>
                  <Input
                    id="users-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="users-password-confirm" className="font-mono text-xs">
                    Confirm password
                  </Label>
                  <Input
                    id="users-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="font-mono text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleCreate();
                    }}
                  />
                </div>
              </>
            ) : (
              generatedLink && (
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs">Sign-up link</Label>
                  <Input
                    readOnly
                    value={generatedLink}
                    onFocus={(e) => e.currentTarget.select()}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground font-mono">
                    Share this link. It can be used once.
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div>
              <h4 className="font-mono text-xs text-muted-foreground mb-2">
                Users with access to this brand
              </h4>
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {currentUsers.length === 0 ? (
                  <p className="px-3 py-3 text-xs font-mono text-muted-foreground">No users yet.</p>
                ) : (
                  <ul className="divide-y">
                    {currentUsers.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center justify-between px-3 py-2 text-xs font-mono"
                      >
                        <span className="truncate">{u.email}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{u.role}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <h4 className="font-mono text-xs text-muted-foreground">
                Grant access to an existing user
              </h4>
              <div className="space-y-1.5">
                <Label className="font-mono text-xs">Email (across your other brands)</Label>
                <Select value={grantEmail} onValueChange={setGrantEmail} disabled={loadingMeta}>
                  <SelectTrigger className="font-mono text-sm h-9">
                    <SelectValue
                      placeholder={
                        loadingMeta
                          ? "Loading…"
                          : candidateEmails.length === 0
                            ? "No other users found"
                            : "Pick an email"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateEmails.map((c) => (
                      <SelectItem key={c.email} value={c.email} className="font-mono text-sm">
                        <span>{c.email}</span>
                        {c.brands.length > 0 && (
                          <span className="ml-2 text-muted-foreground">
                            · {c.brands.join(", ")}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-xs">Role for this brand</Label>
                <Select value={grantRole} onValueChange={setGrantRole}>
                  <SelectTrigger className="font-mono text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r} className="font-mono text-sm">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "create" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("access")}
                disabled={busy}
              >
                Skip
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              {mode === "password" ? (
                <Button
                  size="sm"
                  disabled={
                    busy ||
                    !email.trim() ||
                    password.length < MIN_INITIAL_PASSWORD_LEN ||
                    !passwordConfirm
                  }
                  onClick={() => void handleCreate()}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & continue"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={busy || !email.trim()}
                  onClick={() => void handleGenerateLink()}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate link"}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("create")}
                disabled={busy}
              >
                Back
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleClose(false)}>
                Close
              </Button>
              <Button
                size="sm"
                disabled={busy || !grantEmail}
                onClick={() => void handleGrantAccess()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Grant access"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepChip({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : done
            ? "border-muted bg-muted text-muted-foreground"
            : "border-muted bg-background text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-4 w-4 rounded-full flex items-center justify-center text-[10px]",
          active ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20",
        )}
      >
        {done ? <Check className="h-2.5 w-2.5" /> : num}
      </span>
      {label}
    </div>
  );
}
