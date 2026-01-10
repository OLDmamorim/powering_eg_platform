#!/usr/bin/env python3
"""
Script para traduzir textos hardcoded em ficheiros TSX.
Substitui textos em português por expressões bilingues usando language === 'pt'.
"""

import os
import re
import json

# Dicionário de traduções PT -> EN
TRANSLATIONS = {
    # Placeholders e labels comuns
    "Selecionar meses": "Select months",
    "Selecione uma loja": "Select a store",
    "Selecione a loja": "Select the store",
    "Filtrar por estado": "Filter by status",
    "Filtrar por loja": "Filter by store",
    "Todas as lojas": "All stores",
    "Introduza o token de acesso": "Enter access token",
    "Introduza o token enviado por email": "Enter the token sent by email",
    "Título da tarefa": "Task title",
    "Nome da categoria": "Category name",
    "Pesquisar lojas": "Search stores",
    "Selecionar role": "Select role",
    "Nome completo": "Full name",
    
    # Estados e badges
    "Ativo": "Active",
    "Inativo": "Inactive",
    "Desativado": "Disabled",
    "Pendente": "Pending",
    "Resolvido": "Resolved",
    "Concluído": "Completed",
    "Livre": "Free",
    "Completo": "Complete",
    "Nunca": "Never",
    "Entrar": "Enter",
    "Para si": "For you",
    "Visto": "Seen",
    
    # Mensagens de erro/sucesso
    "Erro ao processar imagens": "Error processing images",
    "Erro ao fazer upload dos ficheiros": "Error uploading files",
    "Erro ao atualizar pendentes": "Error updating pending items",
    "Erro ao criar pendente": "Error creating pending item",
    "Erro ao eliminar pendente": "Error deleting pending item",
    "Erro ao resolver pendente": "Error resolving pending item",
    "Erro ao guardar tópico": "Error saving topic",
    "Erro ao eliminar tópico": "Error deleting topic",
    "Erro ao exportar categoria": "Error exporting category",
    "Erro ao atualizar estado": "Error updating status",
    "Pendente marcado como resolvido": "Pending item marked as resolved",
    "Pendente eliminado": "Pending item deleted",
    "Ocorrência atualizada com sucesso": "Occurrence updated successfully",
    "Ocorrência estrutural reportada com sucesso": "Structural occurrence reported successfully",
    "Email enviado com sucesso para o administrador": "Email sent successfully to administrator",
    "Relatório completo criado com sucesso": "Complete report created successfully",
    "Não foi possível analisar as fotos automaticamente": "Could not analyze photos automatically",
    "Por favor selecione pelo menos uma loja": "Please select at least one store",
    "Por favor indique o estado de todos os pendentes antes de avançar": "Please indicate the status of all pending items before proceeding",
    "Preencha a loja e descrição": "Fill in the store and description",
    "Preencha todos os campos": "Fill in all fields",
    "O título é obrigatório": "Title is required",
    "Deve indicar o motivo da devolução": "Must indicate the reason for return",
    "Deve escrever uma resposta": "Must write a response",
    "Deve escrever uma observação": "Must write an observation",
    "Escreva o feedback": "Write the feedback",
    "Selecione um status": "Select a status",
    "Adicione pelo menos um participante": "Add at least one participant",
    "Digite uma nota para o marcador": "Enter a note for the marker",
    "Marcador removido": "Marker removed",
    "Todos os marcadores foram removidos": "All markers have been removed",
    "Estado atualizado": "Status updated",
    "Categoria não encontrada": "Category not found",
    
    # Descrições e subtítulos
    "Tente ajustar os filtros de pesquisa": "Try adjusting the search filters",
    "Não existem pendentes registados": "No pending items registered",
    "Sem descrição": "No description",
    "Sem loja": "No store",
    "Tópicos submetidos pelos gestores aguardando inclusão em reunião": "Topics submitted by managers awaiting inclusion in meeting",
    "Tópicos que submeteu para discussão": "Topics you submitted for discussion",
    "Nenhum tópico pendente de análise": "No topics pending analysis",
    "Ainda não submeteu nenhum tópico": "You haven't submitted any topics yet",
    "Atualize os detalhes do tópico": "Update topic details",
    "Submeta um tópico para ser discutido na próxima reunião de gestores": "Submit a topic to be discussed at the next managers meeting",
    "Tópicos submetidos pelos gestores para discussão": "Topics submitted by managers for discussion",
    "Submeta tópicos para serem discutidos na próxima reunião de gestores": "Submit topics to be discussed at the next managers meeting",
    "Reuniões operacionais realizadas": "Operational meetings held",
    "Preencha os detalhes da reunião operacional": "Fill in the operational meeting details",
    "Nenhum tópico associado a esta reunião": "No topics associated with this meeting",
    "Reporte situações que não estão ligadas a uma loja específica": "Report situations not linked to a specific store",
    "Comece a escrever para ver sugestões ou crie um novo tema": "Start typing to see suggestions or create a new theme",
    "Proponha uma solução ou ação para resolver esta situação": "Propose a solution or action to resolve this situation",
    "Selecione se há lojas específicas envolvidas": "Select if there are specific stores involved",
    "Nenhuma loja disponível": "No stores available",
    "Clique em \"Analisar\" para gerar previsões": "Click \"Analyze\" to generate predictions",
    
    # Labels de formulário
    "Sugestão de Ação": "Action Suggestion",
    "Classificação": "Classification",
    "Lojas Afetadas": "Affected Stores",
    "Evidências": "Evidence",
    "Galeria": "Gallery",
    "Câmara": "Camera",
    "Foto": "Photo",
    "Evidência": "Evidence",
    "Nacional": "National",
    "Regional": "Regional",
    "Zona": "Zone",
    "Baixo": "Low",
    "Médio": "Medium",
    "Alto": "High",
    "Crítico": "Critical",
    "Situação menor": "Minor situation",
    "Requer atenção": "Requires attention",
    "Urgente": "Urgent",
    "Ação imediata": "Immediate action",
    "Novo tema": "New theme",
    "será criado": "will be created",
    "Opcional": "Optional",
    "Reportado": "Reported",
    "Reportado por": "Reported by",
    "Resolvido em": "Resolved on",
    "Abrangência": "Scope",
    "Impacto": "Impact",
    "Tema": "Theme",
    "Descrição": "Description",
    "Responsável": "Responsible",
    "Prazo": "Deadline",
    "Presenças": "Attendances",
    "Reunião de": "Meeting of",
    "Criado por": "Created by",
    "em": "on",
    "Proposto por": "Proposed by",
    "Submetido por": "Submitted by",
    "Tópico": "Topic",
    "Copiar link": "Copy link",
    "Abrir portal": "Open portal",
    "Enviar token por email": "Send token by email",
    "Loja sem email configurado": "Store without configured email",
    "Desativar": "Disable",
    "Ativar": "Enable",
    "Regenerar token": "Regenerate token",
    "Visualizar pendente completo": "View complete pending item",
    "Nenhum": "None",
    "Loja": "Store",
    "Estado": "Status",
    "Categoria": "Category",
    "Prioridade": "Priority",
    "Gestor": "Manager",
    "Valor": "Value",
    "Informação": "Information",
    "Repor": "Reset",
    "Reabrir": "Reopen",
    "Consumíveis": "Consumables",
    "Reclamações": "Complaints",
    "Fotos": "Photos",
    "Pendentes": "Pending Items",
    "Importante": "Important",
    "Atenção": "Attention",
    "Positivo": "Positive",
    "Negativo": "Negative",
    "Todas as ocorrências reportadas": "All reported occurrences",
    "As suas ocorrências reportadas": "Your reported occurrences",
    "Total": "Total",
    "Reportadas": "Reported",
    "Resolvidas": "Resolved",
    "Todos": "All",
    "Nenhuma ocorrência encontrada": "No occurrences found",
    "foto(s)": "photo(s)",
    "Editar": "Edit",
    "Selecione o primeiro relatório": "Select first report",
    "Selecione o segundo relatório": "Select second report",
    "dias": "days",
    
    # Botões e ações
    "A eliminar...": "Deleting...",
    "A guardar...": "Saving...",
    "A devolver...": "Returning...",
    "Guardar": "Save",
    "Eliminar": "Delete",
    "Cancelar": "Cancel",
    "Devolver": "Return",
    
    # Resultados Upload
    "Selecione o ficheiro Excel com as folhas \"Faturados\" e \"Complementares\"": "Select the Excel file with \"Faturados\" and \"Complementares\" sheets",
    "Instruções - Folha \"Faturados\"": "Instructions - \"Faturados\" Sheet",
    "O ficheiro Excel deve conter uma folha chamada": "The Excel file must contain a sheet named",
    "Instruções - Folha \"Complementares\" (Opcional)": "Instructions - \"Complementares\" Sheet (Optional)",
    "Se existir uma folha chamada": "If there is a sheet named",
    ", será processada automaticamente": ", it will be processed automatically",
}

def create_bilingual_expression(pt_text, en_text):
    """Cria uma expressão bilingue usando language === 'pt'"""
    # Escapar aspas duplas no texto
    pt_escaped = pt_text.replace('"', '\\"')
    en_escaped = en_text.replace('"', '\\"')
    return f'language === \'pt\' ? "{pt_escaped}" : "{en_escaped}"'

def process_file(filepath):
    """Processa um ficheiro TSX e substitui textos hardcoded"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes_made = 0
    
    for pt_text, en_text in TRANSLATIONS.items():
        # Padrão para encontrar textos hardcoded em strings JSX
        # Procura por "texto" ou 'texto' que não esteja já numa expressão ternária
        patterns = [
            # Placeholder em inputs/selects
            (rf'placeholder="({re.escape(pt_text)})"', 
             f'placeholder={{language === \'pt\' ? "{pt_text}" : "{en_text}"}}'),
            # Title em elementos
            (rf'title="({re.escape(pt_text)})"',
             f'title={{language === \'pt\' ? "{pt_text}" : "{en_text}"}}'),
            # Alt em imagens
            (rf'alt="({re.escape(pt_text)})"',
             f'alt={{language === \'pt\' ? "{pt_text}" : "{en_text}"}}'),
            # Texto entre tags
            (rf'>({re.escape(pt_text)})<',
             f'>{{language === \'pt\' ? "{pt_text}" : "{en_text}"}}<'),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                changes_made += 1
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes_made
    return 0

def main():
    pages_dir = '/home/ubuntu/powering_eg_platform/client/src/pages'
    components_dir = '/home/ubuntu/powering_eg_platform/client/src/components'
    
    total_changes = 0
    files_modified = 0
    
    # Processar páginas
    for filename in os.listdir(pages_dir):
        if filename.endswith('.tsx'):
            filepath = os.path.join(pages_dir, filename)
            changes = process_file(filepath)
            if changes > 0:
                print(f"✓ {filename}: {changes} alterações")
                total_changes += changes
                files_modified += 1
    
    # Processar componentes
    for filename in os.listdir(components_dir):
        if filename.endswith('.tsx'):
            filepath = os.path.join(components_dir, filename)
            changes = process_file(filepath)
            if changes > 0:
                print(f"✓ {filename}: {changes} alterações")
                total_changes += changes
                files_modified += 1
    
    print(f"\n=== Resumo ===")
    print(f"Ficheiros modificados: {files_modified}")
    print(f"Total de alterações: {total_changes}")

if __name__ == '__main__':
    main()
