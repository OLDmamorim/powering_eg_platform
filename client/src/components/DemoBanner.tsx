import { useDemo } from "@/contexts/DemoContext";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  const { isDemo, setIsDemo } = useDemo();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) return null;

  const handleExit = () => {
    // Remove ?demo=true da URL
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    window.history.replaceState({}, '', url.toString());
    setIsDemo(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium">
          Modo de Demonstração Ativo - Os dados apresentados são fictícios
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExit}
          className="bg-amber-100 border-amber-700 text-amber-900 hover:bg-amber-200"
        >
          Sair do Demo
        </Button>
        <button 
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-600 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
