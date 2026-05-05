import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Team management is disabled on the Sparti backend: it has no `brand_members` /
 * `brand-team-invite` tables. Sparti uses the existing `brand_users` (with
 * `auth_user_id`) for per-brand access. A future iteration can re-enable this page
 * by querying `brand_users` directly.
 */
export default function Team() {
  return (
    <div className="px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
          <Users className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-mono font-semibold tracking-tight">Team</h1>
          <p className="text-xs text-muted-foreground">
            Brand-scoped operators
          </p>
        </div>
      </div>

      <Card className="max-w-xl p-6 space-y-2">
        <p className="font-mono text-sm">Team management is currently disabled.</p>
        <p className="text-xs text-muted-foreground">
          This deployment talks to the Sparti backend, which doesn&apos;t expose a
          dedicated team-members table. Brand access is managed through the
          existing <span className="font-mono">brand_users</span> table; the UI
          for that will be wired up in a follow-up.
        </p>
      </Card>
    </div>
  );
}
