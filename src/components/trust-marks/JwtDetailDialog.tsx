import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  decodeTrustMarkJwt,
  formatExpiryRelative,
  formatUnixTimestamp,
} from '@/lib/jwt-utils';
import { ValidityBadge } from './ValidityBadge';

interface Props {
  jwt: string;
  open: boolean;
  onClose: () => void;
}

export function JwtDetailDialog({ jwt, open, onClose }: Props) {
  const { toast } = useToast();
  const payload = decodeTrustMarkJwt(jwt);

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trust Mark JWT Payload</DialogTitle>
          <DialogDescription>
            Decoded payload — signature is NOT verified by this viewer.
          </DialogDescription>
        </DialogHeader>

        {payload ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {payload.id && (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Trust Mark Type (id)
                  </Label>
                  <div className="flex items-center gap-1">
                    <p className="font-mono text-xs break-all bg-muted/50 px-2 py-1.5 rounded flex-1">
                      {String(payload.id)}
                    </p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(String(payload.id))}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {payload.iss && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Issuer (iss)</Label>
                  <p className="font-mono text-xs break-all bg-muted/50 px-2 py-1.5 rounded">
                    {String(payload.iss)}
                  </p>
                </div>
              )}

              {payload.sub && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Subject (sub)</Label>
                  <p className="font-mono text-xs break-all bg-muted/50 px-2 py-1.5 rounded">
                    {String(payload.sub)}
                  </p>
                </div>
              )}

              {payload.iat && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Issued At</Label>
                  <p className="text-xs bg-muted/50 px-2 py-1.5 rounded">{formatUnixTimestamp(payload.iat)}</p>
                </div>
              )}

              {payload.exp && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Expires At</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-xs bg-muted/50 px-2 py-1.5 rounded flex-1">
                      {formatUnixTimestamp(payload.exp)} · {formatExpiryRelative(payload.exp)}
                    </p>
                    <ValidityBadge jwt={jwt} />
                  </div>
                </div>
              )}

              {!payload.exp && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Expiry</Label>
                  <ValidityBadge status="unknown" />
                </div>
              )}

              {payload.ref && (
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Reference</Label>
                  <a
                    href={String(payload.ref)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-mono"
                  >
                    {String(payload.ref)} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Raw Payload</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copy(JSON.stringify(payload, null, 2))}>
                  <Copy className="w-3 h-3 mr-1" />Copy JSON
                </Button>
              </div>
              <ScrollArea className="h-[150px] rounded-md border">
                <pre className="p-3 text-xs font-mono">{JSON.stringify(payload, null, 2)}</pre>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4">Unable to decode JWT payload — the token may be malformed.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="ghost" onClick={() => copy(jwt)}>
            <Copy className="w-4 h-4 mr-2" />Copy Raw JWT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
