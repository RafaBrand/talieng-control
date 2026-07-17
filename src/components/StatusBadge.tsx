import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  aberta: "bg-secondary text-secondary-foreground",
  aprovada: "bg-accent text-accent-foreground",
  "em cotação": "bg-warning/15 text-warning",
  comprada: "bg-success/15 text-success",
  pendente: "bg-warning/15 text-warning",
  pago: "bg-success/15 text-success",
  recebido: "bg-success/15 text-success",
  emitida: "bg-accent text-accent-foreground",
  entregue: "bg-success/15 text-success",
  cancelada: "bg-destructive/15 text-destructive",
  planejada: "bg-secondary text-secondary-foreground",
  "em andamento": "bg-accent text-accent-foreground",
  concluida: "bg-success/15 text-success",
  pausada: "bg-warning/15 text-warning",
  baixa: "bg-secondary text-secondary-foreground",
  normal: "bg-accent text-accent-foreground",
  alta: "bg-warning/15 text-warning",
  urgente: "bg-destructive/15 text-destructive",
};

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant="outline" className={cn("capitalize border-0 font-medium", map[status?.toLowerCase()] || "bg-muted text-muted-foreground")}>
    {status?.replace("_", " ")}
  </Badge>
);
