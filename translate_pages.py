#!/usr/bin/env python3
"""
Script para adicionar suporte de tradução PT/EN às páginas React.
Processa todas as páginas que usam useLanguage mas não usam language.
"""

import re
import os

# Lista de páginas a processar
pages_to_process = [
    "AssistenteIA.tsx",
    "Categorias.tsx",
    "ComparacaoRelatoriosIA.tsx",
    "ConfiguracoesAlertas.tsx",
    "DashboardAlertas.tsx",
    "GestaoUtilizadores.tsx",
    "Gestores.tsx",
    "HistoricoLoja.tsx",
    "HistoricoPontos.tsx",
    "HistoricoRelatoriosIA.tsx",
    "HistoricoResumosGlobais.tsx",
    "Lojas.tsx",
    "MeusRelatorios.tsx",
    "MinhasLojas.tsx",
    "OcorrenciaEstrutural.tsx",
    "Pendentes.tsx",
    "PendentesAdmin.tsx",
    "RelatorioBoard.tsx",
    "RelatorioLivre.tsx",
    "Relatorios.tsx",
    "RelatoriosIA.tsx",
    "ResumoGlobal.tsx",
    "ReunioesQuinzenais.tsx",
    "Todos.tsx",
    "TopicosReuniao.tsx",
]

base_path = "/home/ubuntu/powering_eg_platform/client/src/pages/"

def add_language_to_hook(content):
    """Adiciona language ao hook useLanguage se ainda não existir."""
    # Padrão: const { t } = useLanguage();
    pattern = r'const\s*\{\s*t\s*\}\s*=\s*useLanguage\(\)'
    replacement = 'const { language, t } = useLanguage()'
    return re.sub(pattern, replacement, content)

def process_file(filepath):
    """Processa um ficheiro para adicionar language ao hook."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Verificar se já tem language
        if 'language, t' in content or 'language,' in content:
            print(f"  Já tem language: {filepath}")
            return False
        
        # Adicionar language ao hook
        new_content = add_language_to_hook(content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"  Atualizado: {filepath}")
            return True
        else:
            print(f"  Sem alterações: {filepath}")
            return False
    except Exception as e:
        print(f"  Erro em {filepath}: {e}")
        return False

def main():
    print("A processar páginas...")
    updated = 0
    for page in pages_to_process:
        filepath = os.path.join(base_path, page)
        if os.path.exists(filepath):
            if process_file(filepath):
                updated += 1
        else:
            print(f"  Não encontrado: {filepath}")
    
    print(f"\nTotal de ficheiros atualizados: {updated}")

if __name__ == "__main__":
    main()
