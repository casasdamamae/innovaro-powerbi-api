import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";

import authRouter from "./routes/auth.js";
import usuariosRouter from "./routes/usuarios.js";
import resumoRouter from "./routes/resumo.js";
import vendasRouter from "./routes/vendas.js";
import dashboardRouter from "./routes/dashboard.js";
import horaRouter from "./routes/hora.js";
import lojasRouter from "./routes/lojas.js";
import setoresRouter from "./routes/setores.js";
import produtosRouter from "./routes/produtos.js";
import fornecedoresRouter from "./routes/fornecedores.js";
import vendedoresRouter from "./routes/vendedores.js";
import statusRouter from "./routes/status.js";
import metasRouter from "./routes/metas.js";
import metasVendedoresRouter from "./routes/metasVendedores.js";

const app = express();

app.use((req, res, next) => {
  const t0 = Date.now();
  console.log(`→ ${req.method} ${req.originalUrl}`);
  res.on("finish", () =>
    console.log(`← ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t0}ms`)
  );
  res.on("close", () => {
    if (!res.writableFinished) {
      console.log(`✖ ${req.method} ${req.originalUrl} sem resposta após ${Date.now() - t0}ms`);
    }
  });
  next();
});

const corsOptions =
  env.corsOrigin === "*"
    ? {}
    : {
        origin: env.corsOrigin,
      };

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    sistema: "Innovaro Power BI API",
    status: "Online",
    versao: "2.0",
  });
});

app.use("/auth", authRouter);
app.use("/usuarios", usuariosRouter);
app.use("/resumo", resumoRouter);
app.use("/vendas", vendasRouter);
app.use("/dashboard", dashboardRouter);
app.use("/vendas-hora", horaRouter);
app.use("/lojas", lojasRouter);
app.use("/setores", setoresRouter);
app.use("/produtos", produtosRouter);
app.use("/fornecedores", fornecedoresRouter);
app.use("/vendedores", vendedoresRouter);
app.use("/status", statusRouter);
app.use("/metas", metasRouter);
app.use("/metas-vendedores", metasVendedoresRouter);

app.use(errorHandler);

export default app;
