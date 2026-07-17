import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Talieng Control — Gestão de Obras" },
      { name: "description", content: "Sistema de gestão de obras: solicitações, cotações, ordens de compra, financeiro e documentos." },
    ],
  }),
  component: () => <ClientOnly fallback={null}><App /></ClientOnly>,
});
