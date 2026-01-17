import DashboardLayout from "@/components/DashboardLayout";
import { ProjecaoVisitas } from "@/components/ProjecaoVisitas";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ProjecaoVisitasPage() {
  const { language } = useLanguage();
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'pt' ? 'Projeção de Visitas' : 'Visit Projection'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'pt' 
              ? 'Gere sugestões inteligentes de visitas às lojas com base em critérios de priorização'
              : 'Generate smart visit suggestions based on prioritization criteria'}
          </p>
        </div>
        
        <ProjecaoVisitas />
      </div>
    </DashboardLayout>
  );
}
