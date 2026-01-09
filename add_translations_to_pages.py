#!/usr/bin/env python3
"""
Script para adicionar import de useLanguage e const { t } = useLanguage() a páginas
que ainda não têm tradução.
"""

import os
import re

PAGES_DIR = "client/src/pages"

# Lista de páginas para adicionar tradução
pages_to_translate = [
    "Categorias.tsx",
    "ComparacaoLojas.tsx",
    "ComparacaoRelatoriosIA.tsx",
    "ConfiguracoesAlertas.tsx",
    "DashboardAlertas.tsx",
    "HistoricoOcorrencias.tsx",
    "HistoricoRelatoriosIA.tsx",
    "HistoricoResumosGlobais.tsx",
    "OcorrenciaEstrutural.tsx",
    "PendentesAdmin.tsx",
    "RelatorioBoard.tsx",
    "RelatorioCompleto.tsx",
    "RelatorioIAResultados.tsx",
    "ResultadosDashboard.tsx",
    "ResultadosUpload.tsx",
    "ResumoGlobal.tsx",
    "ResumosGlobais.tsx",
    "ReunioesQuinzenais.tsx",
    "ReuniõesGestores.tsx",
    "ReuniõesLojas.tsx",
    "TopicosReuniao.tsx",
]

def add_language_import(content):
    """Adiciona import de useLanguage se não existir"""
    if 'useLanguage' in content:
        return content
    
    # Encontrar último import de @/contexts ou @/hooks
    import_pattern = r'(import.*from\s+["\']@/(contexts|hooks)/[^"\']+["\'];?\n)'
    matches = list(re.finditer(import_pattern, content))
    
    if matches:
        # Adicionar após o último import de contexts/hooks
        last_match = matches[-1]
        insert_pos = last_match.end()
        new_import = 'import { useLanguage } from "@/contexts/LanguageContext";\n'
        return content[:insert_pos] + new_import + content[insert_pos:]
    
    # Se não encontrar, adicionar após imports de @/lib ou @/components
    import_pattern = r'(import.*from\s+["\']@/(lib|components)/[^"\']+["\'];?\n)'
    matches = list(re.finditer(import_pattern, content))
    
    if matches:
        last_match = matches[-1]
        insert_pos = last_match.end()
        new_import = 'import { useLanguage } from "@/contexts/LanguageContext";\n'
        return content[:insert_pos] + new_import + content[insert_pos:]
    
    # Fallback: adicionar após primeiro bloco de imports
    first_import = re.search(r'^import.*\n', content, re.MULTILINE)
    if first_import:
        # Encontrar fim dos imports
        lines = content.split('\n')
        last_import_line = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import ') or (line.strip().startswith('} from') or line.strip().endswith('";') and 'from' in lines[i-1] if i > 0 else False):
                last_import_line = i
        
        # Inserir após último import
        lines.insert(last_import_line + 1, 'import { useLanguage } from "@/contexts/LanguageContext";')
        return '\n'.join(lines)
    
    return content

def add_use_language_hook(content):
    """Adiciona const { t } = useLanguage() no início da função do componente"""
    if '{ t }' in content or 'const { t }' in content:
        return content
    
    # Encontrar padrão: export default function ComponentName() {
    pattern = r'(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)'
    match = re.search(pattern, content)
    
    if match:
        insert_pos = match.end()
        # Verificar se já tem outras declarações
        next_line = content[insert_pos:insert_pos+100]
        if next_line.strip().startswith('const'):
            # Adicionar na mesma linha que outros const
            new_hook = '\n  const { t } = useLanguage();'
        else:
            new_hook = '\n  const { t } = useLanguage();'
        return content[:insert_pos] + new_hook + content[insert_pos:]
    
    return content

def process_file(filepath):
    """Processa um ficheiro e adiciona traduções"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    content = add_language_import(content)
    content = add_use_language_hook(content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    updated = 0
    for page in pages_to_translate:
        filepath = os.path.join(PAGES_DIR, page)
        if os.path.exists(filepath):
            if process_file(filepath):
                print(f"✓ Atualizado: {page}")
                updated += 1
            else:
                print(f"- Já tinha traduções: {page}")
        else:
            print(f"✗ Não encontrado: {page}")
    
    print(f"\nTotal atualizado: {updated} ficheiros")

if __name__ == "__main__":
    main()
