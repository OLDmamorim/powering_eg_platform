import { useState } from "react";
import { Keyboard } from "lucide-react";
import { shortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-24 right-4 h-10 w-10 rounded-full bg-muted/80 hover:bg-muted shadow-md z-50"
          title="Atalhos de Teclado"
        >
          <Keyboard className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atalhos de Teclado
          </DialogTitle>
          <DialogDescription>
            Use estas teclas para navegar rapidamente pela aplicação.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {Object.entries(shortcuts).map(([key, { label }]) => (
            <div
              key={key}
              className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50"
            >
              <span className="text-sm">{label}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded-md shadow-sm">
                {key.toUpperCase()}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Pressione a tecla correspondente para navegar
        </p>
      </DialogContent>
    </Dialog>
  );
}
