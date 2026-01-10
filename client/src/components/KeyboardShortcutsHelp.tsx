import { useState } from "react";
import { Keyboard } from "lucide-react";
import { shortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-24 right-4 h-10 w-10 rounded-full bg-muted/80 hover:bg-muted shadow-md z-50"
          title={language === 'pt' ? 'Atalhos de Teclado' : 'Keyboard Shortcuts'}
        >
          <Keyboard className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {language === 'pt' ? 'Atalhos de Teclado' : 'Keyboard Shortcuts'}
          </DialogTitle>
          <DialogDescription>
            {language === 'pt' 
              ? 'Use estas teclas para navegar rapidamente pela aplicação.'
              : 'Use these keys to quickly navigate through the application.'}
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
          {language === 'pt' 
            ? 'Pressione a tecla correspondente para navegar'
            : 'Press the corresponding key to navigate'}
        </p>
      </DialogContent>
    </Dialog>
  );
}
