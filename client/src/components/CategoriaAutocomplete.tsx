import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoriaAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  sugestoes: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function CategoriaAutocomplete({
  value,
  onChange,
  sugestoes,
  placeholder = "Escreva ou selecione uma categoria...",
  disabled = false,
}: CategoriaAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredSugestoes, setFilteredSugestoes] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = sugestoes.filter(s =>
        s.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredSugestoes(filtered);
    } else {
      setFilteredSugestoes(sugestoes);
    }
  }, [inputValue, sugestoes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
  };

  const handleSelectSugestao = (sugestao: string) => {
    setInputValue(sugestao);
    onChange(sugestao);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      onChange(inputValue.trim());
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && filteredSugestoes.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="max-h-60 overflow-auto p-1">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Sugestões
            </div>
            {filteredSugestoes.map((sugestao) => (
              <button
                key={sugestao}
                type="button"
                onClick={() => handleSelectSugestao(sugestao)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                  sugestao === inputValue && "bg-accent"
                )}
              >
                {sugestao === inputValue && (
                  <Check className="h-4 w-4 text-primary" />
                )}
                <Badge variant="outline" className="font-normal">
                  {sugestao}
                </Badge>
              </button>
            ))}
          </div>
          {inputValue.trim() && !sugestoes.includes(inputValue.trim()) && (
            <div className="border-t p-2">
              <button
                type="button"
                onClick={() => handleSelectSugestao(inputValue.trim())}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Tag className="h-4 w-4" />
                <span>Criar nova categoria: </span>
                <Badge className="font-normal">{inputValue.trim()}</Badge>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
