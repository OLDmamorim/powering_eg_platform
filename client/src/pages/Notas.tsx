import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Archive,
  ArchiveRestore,
  MoreVertical,
  Tag,
  Building2,
  Image as ImageIcon,
  X,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Highlighter,
  StickyNote,
  Check,
  Clock,
  MessageSquare,
  Pause,
  HelpCircle,
  FileCheck,
  FileDown,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExtension from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";

// Paleta de cores para lojas (gera cor determinística por lojaId)
const LOJA_CORES = [
  "#dbeafe", // azul claro
  "#d1fae5", // verde claro
  "#fce7f3", // rosa claro
  "#ede9fe", // roxo claro
  "#fed7aa", // laranja claro
  "#fef3c7", // amarelo claro
  "#ccfbf1", // teal claro
  "#fae8ff", // fuchsia claro
  "#e0e7ff", // indigo claro
  "#fecaca", // vermelho claro
  "#d9f99d", // lima claro
  "#a5f3fc", // cyan claro
];

function getCorPorLoja(lojaId: number): string {
  return LOJA_CORES[lojaId % LOJA_CORES.length];
}

// Cores disponíveis para notas (manual override)
const CORES_NOTAS = [
  { value: "#ffffff", label: "Branco", class: "bg-white border" },
  { value: "#fef3c7", label: "Amarelo", class: "bg-amber-100" },
  { value: "#d1fae5", label: "Verde", class: "bg-emerald-100" },
  { value: "#dbeafe", label: "Azul", class: "bg-blue-100" },
  { value: "#fce7f3", label: "Rosa", class: "bg-pink-100" },
  { value: "#ede9fe", label: "Roxo", class: "bg-violet-100" },
  { value: "#fed7aa", label: "Laranja", class: "bg-orange-100" },
  { value: "#e5e7eb", label: "Cinza", class: "bg-gray-200" },
];

// Estados possíveis das notas
const ESTADOS_NOTAS = [
  { value: "rascunho", label: "Rascunho", icon: StickyNote, color: "bg-gray-100 text-gray-700" },
  { value: "pendente", label: "Pendente", icon: Clock, color: "bg-yellow-100 text-yellow-700" },
  { value: "em_analise", label: "Em Análise", icon: HelpCircle, color: "bg-blue-100 text-blue-700" },
  { value: "discutido", label: "Discutido", icon: MessageSquare, color: "bg-purple-100 text-purple-700" },
  { value: "aprovado", label: "Aprovado", icon: Check, color: "bg-green-100 text-green-700" },
  { value: "adiado", label: "Adiado", icon: Pause, color: "bg-orange-100 text-orange-700" },
  { value: "concluido", label: "Concluído", icon: FileCheck, color: "bg-emerald-100 text-emerald-700" },
];

// Cores para tags
const CORES_TAGS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

function getEstadoInfo(estado: string) {
  return ESTADOS_NOTAS.find(e => e.value === estado) || ESTADOS_NOTAS[0];
}

// Exportar nota para PDF
async function exportarNotaPDF(nota: any) {
  const estadoInfo = getEstadoInfo(nota.estado);
  
  // Formatar data de criacao
  let dataFormatada = "";
  try {
    const d = nota.createdAt ? new Date(nota.createdAt) : null;
    if (d && !isNaN(d.getTime())) {
      dataFormatada = d.toLocaleDateString("pt-PT", {
        day: "2-digit", month: "long", year: "numeric"
      });
    } else {
      dataFormatada = new Date().toLocaleDateString("pt-PT", {
        day: "2-digit", month: "long", year: "numeric"
      });
    }
  } catch {
    dataFormatada = new Date().toLocaleDateString("pt-PT", {
      day: "2-digit", month: "long", year: "numeric"
    });
  }

  // Data de ultima actualizacao
  let dataActualizada = "";
  try {
    const d = nota.updatedAt ? new Date(nota.updatedAt) : null;
    if (d && !isNaN(d.getTime())) {
      dataActualizada = d.toLocaleDateString("pt-PT", {
        day: "2-digit", month: "long", year: "numeric"
      });
    }
  } catch { /* ignore */ }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${nota.titulo || "Nota"}</title>
      <style>
        @page { margin: 2cm; size: A4; }
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.6; margin: 0; padding: 0; }
        .page { padding: 40px; min-height: 100vh; display: flex; flex-direction: column; }
        /* Cabeçalho padrao PoweringEG */
        .top-bar { height: 4px; background: #3b82f6; width: 100%; }
        .header { text-align: center; padding: 20px 0 16px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; }
        .header h1 { font-size: 22px; margin: 0 0 8px 0; color: #1e293b; font-weight: 700; }
        .header .subtitle { font-size: 11px; color: #64748b; }
        .meta { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 12px; }
        .meta-item { font-size: 11px; color: #64748b; padding: 4px 12px; border-radius: 4px; background: #f1f5f9; }
        .meta-item.estado { background: #ede9fe; color: #6d28d9; font-weight: 600; }
        .meta-item.loja { background: #dbeafe; color: #1d4ed8; font-weight: 600; }
        .meta-item.data { background: #f0fdf4; color: #166534; }
        /* Conteudo */
        .content { font-size: 13px; flex: 1; padding: 8px 0; }
        .content h1, .content h2, .content h3 { color: #1e293b; margin-top: 20px; }
        .content h2 { font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .content img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
        .content ul, .content ol { padding-left: 24px; }
        .content mark { background-color: #fef08a; padding: 2px 4px; border-radius: 2px; }
        .content p { margin: 8px 0; }
        /* Tags */
        .tags { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
        .tags-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .tag { display: inline-block; font-size: 10px; color: white; padding: 3px 10px; border-radius: 4px; margin-right: 6px; margin-bottom: 4px; }
        /* Rodape padrao PoweringEG */
        .footer { margin-top: auto; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; }
        .footer .brand { font-size: 10px; color: #94a3b8; font-style: italic; }
        .footer .page-info { font-size: 9px; color: #cbd5e1; margin-top: 4px; }
        @media print {
          .page { padding: 0; }
          .top-bar { position: fixed; top: 0; left: 0; right: 0; }
        }
      </style>
    </head>
    <body>
      <div class="top-bar"></div>
      <div class="page">
        <div class="header">
          <h1>${nota.titulo || "Sem titulo"}</h1>
          <div class="subtitle">Nota / Dossier</div>
          <div class="meta">
            <span class="meta-item estado">${estadoInfo.label}</span>
            ${nota.loja ? `<span class="meta-item loja">${nota.loja.nome}</span>` : ""}
            <span class="meta-item data">Criado: ${dataFormatada}</span>
            ${dataActualizada && dataActualizada !== dataFormatada ? `<span class="meta-item">Atualizado: ${dataActualizada}</span>` : ""}
          </div>
        </div>
        <div class="content">
          ${nota.conteudo || "<p>Sem conteudo</p>"}
        </div>
        ${nota.tags && nota.tags.length > 0 ? `
          <div class="tags">
            <div class="tags-label">Tags</div>
            ${nota.tags.map((t: any) => `<span class="tag" style="background-color:${t.cor}">${t.nome}</span>`).join("")}
          </div>
        ` : ""}
        <div class="footer">
          <div class="brand">PoweringEG Platform 2.0 - a IA ao servico da ExpressGlass</div>
          <div class="page-info">Exportado em ${new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}

// Componente de barra de ferramentas do editor
function EditorToolbar({ editor }: { editor: any }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 border-b border-border/50 pb-2 mb-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 ${editor.isActive("bold") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 ${editor.isActive("italic") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 ${editor.isActive("underline") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 ${editor.isActive("highlight") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 ${editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 ${editor.isActive("bulletList") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 ${editor.isActive("orderedList") ? "bg-muted" : ""}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// Componente de compressão de imagem
async function comprimirImagem(file: File, maxWidth = 1200, quality = 0.7): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg" });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Dialog de edição de nota
function NotaEditor({
  open,
  onClose,
  nota,
  lojas,
  tags,
  onSave,
  onUploadImage,
}: {
  open: boolean;
  onClose: () => void;
  nota: any;
  lojas: any[];
  tags: any[];
  onSave: (data: any) => void;
  onUploadImage: (notaId: number, file: File) => Promise<string | null>;
}) {
  const [titulo, setTitulo] = useState(nota?.titulo || "");
  const [lojaId, setLojaId] = useState<string>(nota?.lojaId?.toString() || "none");
  const [estado, setEstado] = useState(nota?.estado || "rascunho");
  const [corManual, setCorManual] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    nota?.tags?.map((t: any) => t.id) || []
  );
  const [showTagManager, setShowTagManager] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved" | "">(nota?.id ? "saved" : "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  // Cor determinada: se tem loja, usa cor da loja; senão branco; manual override
  const corActual = useMemo(() => {
    if (corManual) return corManual;
    if (lojaId !== "none") return getCorPorLoja(parseInt(lojaId));
    return nota?.cor || "#ffffff";
  }, [lojaId, corManual, nota?.cor]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({ inline: true }),
      Placeholder.configure({ placeholder: "Escreve aqui o conteúdo da nota..." }),
      UnderlineExtension,
      Highlight.configure({ multicolor: false }),
    ],
    content: nota?.conteudo || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-1",
      },
    },
  });

  // Reset when nota changes
  useEffect(() => {
    if (nota) {
      setTitulo(nota.titulo || "");
      setLojaId(nota.lojaId?.toString() || "none");
      setEstado(nota.estado || "rascunho");
      setCorManual(null);
      setSelectedTagIds(nota.tags?.map((t: any) => t.id) || []);
      setAutoSaveStatus(nota.id ? "saved" : "");
      lastSavedRef.current = JSON.stringify({
        titulo: nota.titulo || "",
        conteudo: nota.conteudo || "",
        lojaId: nota.lojaId?.toString() || "none",
        estado: nota.estado || "rascunho",
        tagIds: nota.tags?.map((t: any) => t.id) || [],
      });
      if (editor) {
        editor.commands.setContent(nota.conteudo || "");
      }
    } else {
      setTitulo("");
      setLojaId("none");
      setEstado("rascunho");
      setCorManual(null);
      setSelectedTagIds([]);
      setAutoSaveStatus("");
      lastSavedRef.current = "";
      if (editor) {
        editor.commands.setContent("");
      }
    }
  }, [nota, editor]);

  // Auto-save: debounce de 2 segundos após qualquer alteração
  const triggerAutoSave = useCallback(() => {
    if (!nota?.id) return; // Só auto-save em notas já criadas
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus("unsaved");
    autoSaveTimerRef.current = setTimeout(() => {
      const currentState = JSON.stringify({
        titulo: titulo.trim(),
        conteudo: editor?.getHTML() || "",
        lojaId,
        estado,
        tagIds: selectedTagIds,
      });
      if (currentState === lastSavedRef.current) return; // Sem alterações
      lastSavedRef.current = currentState;
      setAutoSaveStatus("saving");
      onSave({
        id: nota.id,
        titulo: titulo.trim(),
        conteudo: editor?.getHTML() || "",
        lojaId: lojaId === "none" ? null : parseInt(lojaId),
        estado,
        cor: corActual,
        tagIds: selectedTagIds,
        _autoSave: true, // Flag para não fechar o editor
      });
      setTimeout(() => setAutoSaveStatus("saved"), 800);
    }, 2000);
  }, [nota?.id, titulo, lojaId, estado, selectedTagIds, corActual, editor, onSave]);

  // Trigger auto-save quando titulo, estado, loja ou tags mudam
  useEffect(() => {
    if (nota?.id) triggerAutoSave();
  }, [titulo, lojaId, estado, selectedTagIds]);

  // Trigger auto-save quando o conteúdo do editor muda
  useEffect(() => {
    if (!editor || !nota?.id) return;
    const handler = () => triggerAutoSave();
    editor.on("update", handler);
    return () => { editor.off("update", handler); };
  }, [editor, nota?.id, triggerAutoSave]);

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const handleSave = () => {
    if (!titulo.trim()) {
      toast.error("O título é obrigatório");
      return;
    }
    // Cancelar auto-save pendente
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    onSave({
      id: nota?.id,
      titulo: titulo.trim(),
      conteudo: editor?.getHTML() || "",
      lojaId: lojaId === "none" ? null : parseInt(lojaId),
      estado,
      cor: corActual,
      tagIds: selectedTagIds,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!nota?.id) {
      toast.error("Guarda a nota primeiro antes de adicionar imagens");
      return;
    }
    setUploading(true);
    try {
      const url = await onUploadImage(nota.id, file);
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleLojaChange = (value: string) => {
    setLojaId(value);
    // Reset cor manual quando muda loja (usa cor automática)
    setCorManual(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {nota?.id ? "Editar Nota" : "Nova Nota"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Título */}
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título da nota..."
            className="text-lg font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          />

          {/* Barra de metadados */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Estado */}
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_NOTAS.map(e => (
                  <SelectItem key={e.value} value={e.value}>
                    <span className="flex items-center gap-1.5">
                      <e.icon className="h-3.5 w-3.5" />
                      {e.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Loja (filtrada por gestor) */}
            <Select value={lojaId} onValueChange={handleLojaChange}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Sem loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Sem loja associada
                  </span>
                </SelectItem>
                {lojas.sort((a: any, b: any) => a.nome.localeCompare(b.nome)).map((l: any) => (
                  <SelectItem key={l.id} value={l.id.toString()}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: getCorPorLoja(l.id) }}
                      />
                      {l.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Cor manual (override) */}
            <div className="flex gap-1 items-center">
              {CORES_NOTAS.map(c => (
                <button
                  key={c.value}
                  className={`w-5 h-5 rounded-full ${c.class} ${corActual === c.value ? "ring-2 ring-primary ring-offset-1" : ""}`}
                  onClick={() => setCorManual(c.value)}
                  title={c.label}
                />
              ))}
            </div>

            {/* Upload imagem */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !nota?.id}
            >
              <ImageIcon className="h-3.5 w-3.5 mr-1" />
              {uploading ? "A enviar..." : "Imagem"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Exportar PDF */}
            {nota?.id && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => exportarNotaPDF(nota)}
              >
                <FileDown className="h-3.5 w-3.5 mr-1" />
                PDF
              </Button>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            {tags.map(tag => (
              <Badge
                key={tag.id}
                variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer text-xs h-6"
                style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.cor } : {}}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.nome}
              </Badge>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={() => setShowTagManager(true)}
            >
              + Tag
            </Button>
          </div>

          {/* Editor */}
          <div className="border rounded-lg p-4" style={{ backgroundColor: corActual }}>
            <EditorToolbar editor={editor} />
            <EditorContent editor={editor} />
          </div>

          {/* Imagens da nota */}
          {nota?.imagens && nota.imagens.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nota.imagens.map((img: any) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.url}
                    alt={img.filename || "Imagem"}
                    className="h-20 w-20 object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-between items-center pt-2">
            {/* Indicador de auto-save */}
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {autoSaveStatus === "saved" && (
                <><Check className="h-3.5 w-3.5 text-green-500" /> Guardado automaticamente</>
              )}
              {autoSaveStatus === "saving" && (
                <><Clock className="h-3.5 w-3.5 text-blue-500 animate-pulse" /> A guardar...</>
              )}
              {autoSaveStatus === "unsaved" && (
                <><Clock className="h-3.5 w-3.5 text-amber-500" /> Alterações por guardar</>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button onClick={handleSave}>
                {nota?.id ? "Guardar e Fechar" : "Criar Nota"}
              </Button>
            </div>
          </div>
        </div>

        {/* Tag Manager Dialog */}
        {showTagManager && (
          <TagManager
            tags={tags}
            onClose={() => setShowTagManager(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Componente de gestão de tags
function TagManager({
  tags,
  onClose,
}: {
  tags: any[];
  onClose: () => void;
}) {
  const [novaTag, setNovaTag] = useState("");
  const [corTag, setCorTag] = useState(CORES_TAGS[0]);
  const utils = trpc.useUtils();

  const criarTagMutation = trpc.notas.criarTag.useMutation({
    onSuccess: () => {
      utils.notas.listarTags.invalidate();
      setNovaTag("");
      toast.success("Tag criada");
    },
  });

  const eliminarTagMutation = trpc.notas.eliminarTag.useMutation({
    onSuccess: () => {
      utils.notas.listarTags.invalidate();
      toast.success("Tag eliminada");
    },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerir Tags</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={novaTag}
              onChange={(e) => setNovaTag(e.target.value)}
              placeholder="Nova tag..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && novaTag.trim()) {
                  criarTagMutation.mutate({ nome: novaTag.trim(), cor: corTag });
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                if (novaTag.trim()) {
                  criarTagMutation.mutate({ nome: novaTag.trim(), cor: corTag });
                }
              }}
              disabled={!novaTag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {CORES_TAGS.map(c => (
              <button
                key={c}
                className={`w-6 h-6 rounded-full ${corTag === c ? "ring-2 ring-primary ring-offset-1" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => setCorTag(c)}
              />
            ))}
          </div>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between py-1">
                <Badge style={{ backgroundColor: tag.cor }} className="text-white">
                  {tag.nome}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => eliminarTagMutation.mutate({ tagId: tag.id })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {tags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma tag criada
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente principal
export default function Notas() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [pesquisa, setPesquisa] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroLoja, setFiltroLoja] = useState("todos");
  const [filtroTag, setFiltroTag] = useState("todos");
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [notaAtual, setNotaAtual] = useState<any>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: notasData, isLoading } = trpc.notas.listar.useQuery({
    estado: filtroEstado !== "todos" ? filtroEstado : undefined,
    lojaId: filtroLoja !== "todos" ? parseInt(filtroLoja) : undefined,
    tagId: filtroTag !== "todos" ? parseInt(filtroTag) : undefined,
    arquivada: mostrarArquivadas,
    pesquisa: pesquisa || undefined,
  });

  // Usar lojas do gestor (não todas)
  const { data: minhasLojas } = trpc.lojas.getByGestor.useQuery();
  const { data: todasLojas } = trpc.lojas.list.useQuery(undefined, { enabled: isAdmin });
  const lojas = isAdmin ? todasLojas : minhasLojas;

  const { data: tags } = trpc.notas.listarTags.useQuery();

  // Nota completa para edição
  const { data: notaCompleta } = trpc.notas.getById.useQuery(
    { id: notaAtual?.id },
    { enabled: !!notaAtual?.id && editorOpen }
  );

  // Mutations
  const criarMutation = trpc.notas.criar.useMutation({
    onSuccess: (data) => {
      utils.notas.listar.invalidate();
      // Reabrir com o ID para permitir upload de imagens
      setNotaAtual({ id: data.id });
      toast.success("Nota criada");
    },
  });

  const actualizarMutation = trpc.notas.actualizar.useMutation({
    onSuccess: (_data, variables) => {
      utils.notas.listar.invalidate();
      // Se é auto-save, não fechar o editor nem mostrar toast
      if ((variables as any)._autoSave) return;
      setEditorOpen(false);
      setNotaAtual(null);
      toast.success("Nota guardada");
    },
  });

  const eliminarMutation = trpc.notas.eliminar.useMutation({
    onSuccess: () => {
      utils.notas.listar.invalidate();
      toast.success("Nota eliminada");
    },
  });

  const uploadImagemMutation = trpc.notas.uploadImagem.useMutation();

  // Handlers
  const handleNovaNota = () => {
    setNotaAtual(null);
    setEditorOpen(true);
  };

  const handleEditarNota = (nota: any) => {
    setNotaAtual(nota);
    setEditorOpen(true);
  };

  const handleSave = (data: any) => {
    if (data.id) {
      // Remover _autoSave do payload antes de enviar ao backend
      const { _autoSave, ...payload } = data;
      actualizarMutation.mutate({ ...payload, _autoSave } as any);
    } else {
      const { _autoSave, ...payload } = data;
      criarMutation.mutate(payload);
    }
  };

  const handleUploadImage = async (notaId: number, file: File): Promise<string | null> => {
    try {
      const { base64, mimeType } = await comprimirImagem(file);
      const result = await uploadImagemMutation.mutateAsync({
        notaId,
        base64,
        filename: file.name,
        mimeType,
      });
      utils.notas.getById.invalidate({ id: notaId });
      return result.url;
    } catch (err) {
      toast.error("Erro ao enviar imagem");
      return null;
    }
  };

  const handleFixar = (nota: any) => {
    actualizarMutation.mutate({
      id: nota.id,
      fixada: !nota.fixada,
    });
  };

  const handleArquivar = (nota: any) => {
    actualizarMutation.mutate({
      id: nota.id,
      arquivada: !nota.arquivada,
    });
  };

  const handleMudarEstado = (nota: any, estado: string) => {
    actualizarMutation.mutate({
      id: nota.id,
      estado,
    });
  };

  // Separar fixadas das não fixadas
  const notasFixadas = useMemo(() => notasData?.filter((n: any) => n.fixada) || [], [notasData]);
  const notasNormais = useMemo(() => notasData?.filter((n: any) => !n.fixada) || [], [notasData]);

  const notaParaEditar = notaCompleta || notaAtual;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <StickyNote className="h-6 w-6 text-yellow-500" />
              Notas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Dossiers para reuniões, discussões e acompanhamento
            </p>
          </div>
          <Button onClick={handleNovaNota} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Nota
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar notas..."
              className="pl-9 h-9"
            />
          </div>

          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              {ESTADOS_NOTAS.map(e => (
                <SelectItem key={e.value} value={e.value}>
                  <span className="flex items-center gap-1.5">
                    <e.icon className="h-3.5 w-3.5" />
                    {e.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroLoja} onValueChange={setFiltroLoja}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Loja" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as lojas</SelectItem>
              {(lojas || []).sort((a: any, b: any) => a.nome.localeCompare(b.nome)).map((l: any) => (
                <SelectItem key={l.id} value={l.id.toString()}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: getCorPorLoja(l.id) }}
                    />
                    {l.nome}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroTag} onValueChange={setFiltroTag}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as tags</SelectItem>
              {(tags || []).map((t: any) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={mostrarArquivadas ? "secondary" : "ghost"}
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setMostrarArquivadas(!mostrarArquivadas)}
          >
            <Archive className="h-3.5 w-3.5" />
            {mostrarArquivadas ? "Arquivadas" : "Arquivo"}
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Notas Fixadas */}
        {notasFixadas.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Fixadas
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notasFixadas.map((nota: any) => (
                <NotaCard
                  key={nota.id}
                  nota={nota}
                  onEdit={() => handleEditarNota(nota)}
                  onFixar={() => handleFixar(nota)}
                  onArquivar={() => handleArquivar(nota)}
                  onEliminar={() => eliminarMutation.mutate({ id: nota.id })}
                  onMudarEstado={(estado) => handleMudarEstado(nota, estado)}
                  onExportarPDF={() => exportarNotaPDF(nota)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Notas Normais */}
        {notasNormais.length > 0 && (
          <div>
            {notasFixadas.length > 0 && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Outras
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notasNormais.map((nota: any) => (
                <NotaCard
                  key={nota.id}
                  nota={nota}
                  onEdit={() => handleEditarNota(nota)}
                  onFixar={() => handleFixar(nota)}
                  onArquivar={() => handleArquivar(nota)}
                  onEliminar={() => eliminarMutation.mutate({ id: nota.id })}
                  onMudarEstado={(estado) => handleMudarEstado(nota, estado)}
                  onExportarPDF={() => exportarNotaPDF(nota)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Vazio */}
        {!isLoading && (!notasData || notasData.length === 0) && (
          <div className="text-center py-16">
            <StickyNote className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {mostrarArquivadas ? "Nenhuma nota arquivada" : "Nenhuma nota encontrada"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {pesquisa || filtroEstado !== "todos" || filtroLoja !== "todos" || filtroTag !== "todos"
                ? "Tenta ajustar os filtros"
                : "Cria a tua primeira nota para começar"}
            </p>
            {!mostrarArquivadas && !pesquisa && filtroEstado === "todos" && (
              <Button onClick={handleNovaNota} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Nova Nota
              </Button>
            )}
          </div>
        )}

        {/* Editor Dialog */}
        {editorOpen && (
          <NotaEditor
            open={editorOpen}
            onClose={() => {
              setEditorOpen(false);
              setNotaAtual(null);
            }}
            nota={notaParaEditar}
            lojas={lojas || []}
            tags={tags || []}
            onSave={handleSave}
            onUploadImage={handleUploadImage}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// Card de nota individual
function NotaCard({
  nota,
  onEdit,
  onFixar,
  onArquivar,
  onEliminar,
  onMudarEstado,
  onExportarPDF,
}: {
  nota: any;
  onEdit: () => void;
  onFixar: () => void;
  onArquivar: () => void;
  onEliminar: () => void;
  onMudarEstado: (estado: string) => void;
  onExportarPDF: () => void;
}) {
  const estadoInfo = getEstadoInfo(nota.estado);
  const EstadoIcon = estadoInfo.icon;

  // Cor do card: se tem loja e cor é branco, usa cor da loja
  const cardCor = useMemo(() => {
    if (nota.cor && nota.cor !== "#ffffff") return nota.cor;
    if (nota.lojaId) return getCorPorLoja(nota.lojaId);
    return "#ffffff";
  }, [nota.cor, nota.lojaId]);

  // Extrair texto simples do HTML para preview
  const textoPreview = useMemo(() => {
    if (!nota.conteudo) return "";
    const div = document.createElement("div");
    div.innerHTML = nota.conteudo;
    return div.textContent?.substring(0, 200) || "";
  }, [nota.conteudo]);

  // Primeira imagem para preview
  const primeiraImagem = nota.imagens?.[0]?.url;

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      style={{ backgroundColor: cardCor }}
      onClick={onEdit}
    >
      {/* Imagem preview */}
      {primeiraImagem && (
        <div className="h-32 overflow-hidden">
          <img
            src={primeiraImagem}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Header com pin e menu */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm line-clamp-2 flex-1 text-foreground">
            {nota.titulo}
          </h3>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onFixar();
              }}
            >
              {nota.fixada ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {ESTADOS_NOTAS.map(e => (
                  <DropdownMenuItem
                    key={e.value}
                    onClick={() => onMudarEstado(e.value)}
                    className={nota.estado === e.value ? "bg-muted" : ""}
                  >
                    <e.icon className="h-3.5 w-3.5 mr-2" />
                    {e.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onExportarPDF}>
                  <FileDown className="h-3.5 w-3.5 mr-2" />
                  Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onArquivar}>
                  {nota.arquivada ? (
                    <>
                      <ArchiveRestore className="h-3.5 w-3.5 mr-2" />
                      Desarquivar
                    </>
                  ) : (
                    <>
                      <Archive className="h-3.5 w-3.5 mr-2" />
                      Arquivar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onEliminar}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Preview do conteúdo */}
        {textoPreview && (
          <p className="text-xs text-muted-foreground line-clamp-4">
            {textoPreview}
          </p>
        )}

        {/* Tags */}
        {nota.tags && nota.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {nota.tags.map((tag: any) => (
              <Badge
                key={tag.id}
                className="text-[10px] h-5 px-1.5 text-white"
                style={{ backgroundColor: tag.cor }}
              >
                {tag.nome}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer: estado + loja + data */}
        <div className="flex items-center justify-between pt-1">
          <Badge variant="secondary" className={`text-[10px] h-5 ${estadoInfo.color}`}>
            <EstadoIcon className="h-3 w-3 mr-1" />
            {estadoInfo.label}
          </Badge>
          <div className="flex items-center gap-2">
            {nota.loja && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {nota.loja.nome}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {(() => {
                try {
                  const d = nota.createdAt ? new Date(nota.createdAt) : null;
                  if (d && !isNaN(d.getTime())) {
                    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit" });
                  }
                  return "";
                } catch { return ""; }
              })()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
