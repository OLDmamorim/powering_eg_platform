import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      if (!userInfo.email) {
        res.status(400).json({ error: "Email é obrigatório para login" });
        return;
      }

      // AUTENTICAÇÃO RESTRITA: Verificar se o email já existe na base de dados
      const existingUserByEmail = await db.getUserByEmail(userInfo.email);
      
      if (!existingUserByEmail) {
        // Email não existe - login não autorizado
        console.log(`[OAuth] Login rejeitado: email ${userInfo.email} não está registado`);
        res.redirect(302, "/login-nao-autorizado");
        return;
      }

      // Email existe - verificar se precisa atualizar o openId
      if (existingUserByEmail.openId.startsWith('pending-')) {
        // Primeiro login do user - atualizar openId para o real
        console.log(`[OAuth] Primeiro login de ${userInfo.email} - atualizando openId`);
        await db.updateUserOpenId(existingUserByEmail.id, userInfo.openId, userInfo.name || existingUserByEmail.name);
      } else if (existingUserByEmail.openId !== userInfo.openId) {
        // OpenId diferente - pode ser login com outro provider
        console.log(`[OAuth] Login com provider diferente para ${userInfo.email}`);
        // Atualizar para o novo openId (permite trocar de Google para Microsoft, etc.)
        await db.updateUserOpenId(existingUserByEmail.id, userInfo.openId, userInfo.name || existingUserByEmail.name);
      }

      // Atualizar lastSignedIn
      await db.updateUserLastSignedIn(existingUserByEmail.id);

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || existingUserByEmail.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
