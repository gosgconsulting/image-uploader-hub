import { useState } from "react";
import { Settings, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WebhookSettingsProps {
  webhookUrl: string;
  onWebhookUrlChange: (url: string) => void;
}

export function WebhookSettings({ webhookUrl, onWebhookUrlChange }: WebhookSettingsProps) {
  const [value, setValue] = useState(webhookUrl);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onWebhookUrlChange(value);
    localStorage.setItem("webhook_url", value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Webhook
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <Label className="font-mono text-xs uppercase tracking-wider">Webhook URL</Label>
          <Input
            placeholder="https://your-n8n.app/webhook/..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button size="sm" onClick={handleSave} className="w-full">
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Saved
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
