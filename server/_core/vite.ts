import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import * as db from "../db";

// Função para obter informações da loja pelo token
async function getLojaInfoByToken(token: string): Promise<{ nome: string; gestor: string } | null> {
  try {
    const auth = await db.validarTokenLoja(token);
    if (!auth) return null;
    const gestor = await db.getGestorDaLoja(auth.loja.id);
    return {
      nome: auth.loja.nome,
      gestor: gestor?.nome || 'N/A'
    };
  } catch (e) {
    console.error('Erro ao obter info da loja:', e);
    return null;
  }
}

// Função para injetar meta tags dinâmicos
function injectDynamicMetaTags(html: string, lojaInfo: { nome: string; gestor: string }): string {
  const title = `${lojaInfo.nome} - PoweringEG`;
  const description = `Portal da Loja ${lojaInfo.nome} - Gestor: ${lojaInfo.gestor}. Aceda aos resultados, tarefas e reuniões quinzenais.`;
  
  // Substituir o título
  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  
  // Substituir meta description
  html = html.replace(
    /<meta name="description" content=".*?" \/>/,
    `<meta name="description" content="${description}" />`
  );
  
  // Substituir Open Graph tags
  html = html.replace(
    /<meta property="og:title" content=".*?" \/>/,
    `<meta property="og:title" content="${title}" />`
  );
  html = html.replace(
    /<meta property="og:description" content=".*?" \/>/,
    `<meta property="og:description" content="${description}" />`
  );
  
  // Substituir Twitter tags
  html = html.replace(
    /<meta name="twitter:title" content=".*?" \/>/,
    `<meta name="twitter:title" content="${title}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content=".*?" \/>/,
    `<meta name="twitter:description" content="${description}" />`
  );
  
  return html;
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      
      // Verificar se é o Portal da Loja e tem token
      if (url.includes('/portal-loja') && url.includes('token=')) {
        const urlParams = new URLSearchParams(url.split('?')[1] || '');
        const token = urlParams.get('token');
        if (token) {
          const lojaInfo = await getLojaInfoByToken(token);
          if (lojaInfo) {
            template = injectDynamicMetaTags(template, lojaInfo);
          }
        }
      }
      
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res) => {
    const url = req.originalUrl;
    const indexPath = path.resolve(distPath, "index.html");
    
    // Verificar se é o Portal da Loja e tem token
    if (url.includes('/portal-loja') && url.includes('token=')) {
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const token = urlParams.get('token');
      if (token) {
        try {
          const lojaInfo = await getLojaInfoByToken(token);
          if (lojaInfo) {
            let html = await fs.promises.readFile(indexPath, 'utf-8');
            html = injectDynamicMetaTags(html, lojaInfo);
            res.status(200).set({ "Content-Type": "text/html" }).end(html);
            return;
          }
        } catch (e) {
          console.error('Erro ao injetar meta tags:', e);
        }
      }
    }
    
    res.sendFile(indexPath);
  });
}
