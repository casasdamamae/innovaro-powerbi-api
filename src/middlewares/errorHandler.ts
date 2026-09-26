import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status || 500;
  console.error(err);

  res.status(status).json({
    sucesso: false,
    mensagem: err.message || "Erro interno",
    erro: err.message,
  });
}
