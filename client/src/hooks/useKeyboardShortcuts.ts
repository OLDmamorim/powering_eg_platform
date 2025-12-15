import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";

// Mapeamento de atalhos de teclado
export const shortcuts: Record<string, { key: string; path: string; label: string }> = {
  d: { key: "D", path: "/dashboard", label: "Dashboard" },
  l: { key: "L", path: "/lojas", label: "Lojas" },
  g: { key: "G", path: "/gestores", label: "Gestores" },
  r: { key: "R", path: "/relatorios", label: "Relatórios" },
  i: { key: "I", path: "/relatorios-ia", label: "Relatórios IA" },
  h: { key: "H", path: "/historico-pontos", label: "Histórico" },
  a: { key: "A", path: "/alertas", label: "Alertas" },
  p: { key: "P", path: "/pendentes", label: "Pendentes" },
};

export function useKeyboardShortcuts() {
  const [, setLocation] = useLocation();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignorar se estiver a escrever num input ou textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    // Ignorar se tiver modificadores (Ctrl, Alt, Meta)
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const key = event.key.toLowerCase();
    const shortcut = shortcuts[key];

    if (shortcut) {
      event.preventDefault();
      setLocation(shortcut.path);
    }
  }, [setLocation]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
