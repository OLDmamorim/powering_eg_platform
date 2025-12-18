import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Eye, Edit2, Check, X } from "lucide-react";

interface VisualizarPendenteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendente: {
    descricao: string;
    categoria?: string;
  };
  onSave?: (novaDescricao: string) => void;
}

export function VisualizarPendente({
  open,
  onOpenChange,
  pendente,
  onSave,
}: VisualizarPendenteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [descricaoEditada, setDescricaoEditada] = useState(pendente.descricao);

  const handleSave = () => {
    if (onSave) {
      onSave(descricaoEditada);
    }
    setIsEditing(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setDescricaoEditada(pendente.descricao);
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visualizar Pendente
            {pendente.categoria && (
              <span className="text-sm font-normal text-muted-foreground">
                ({pendente.categoria})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isEditing ? (
            <>
              <Textarea
                value={descricaoEditada}
                onChange={(e) => setDescricaoEditada(e.target.value)}
                className="min-h-[200px] resize-none"
                placeholder="Descrição do pendente..."
              />
              <div className="flex justify-end gap-2">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Check className="h-4 w-4" />
                  Guardar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/50 rounded-lg p-4 min-h-[200px] whitespace-pre-wrap">
                {pendente.descricao}
              </div>
              {onSave && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
