import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/hello-world")({
  server: {
    handlers: {
      GET: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return Response.json("Informação carregada pelo seu próprio BFF");
      },
    },
  },
});
