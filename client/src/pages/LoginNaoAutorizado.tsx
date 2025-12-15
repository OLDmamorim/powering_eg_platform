import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, ArrowLeft } from "lucide-react";

export default function LoginNaoAutorizado() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Acesso Não Autorizado</CardTitle>
          <CardDescription className="text-base mt-2">
            O seu email não está registado no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Apenas utilizadores previamente registados pelo administrador podem aceder a esta plataforma.
          </p>
          <p className="text-center text-muted-foreground">
            Se deveria ter acesso, contacte o administrador do sistema para que o seu email seja adicionado.
          </p>
          <div className="pt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = "/"}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
