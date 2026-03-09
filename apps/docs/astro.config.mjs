import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "react-sse-chat",
      description:
        "A lightweight React hook for consuming Server-Sent Events (SSE) from AI chat backends.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/devscalelabs/react-sse-chat",
        },
      ],
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Guide",
          autogenerate: { directory: "guide" },
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
        {
          label: "Cookbook",
          autogenerate: { directory: "cookbook" },
        },
      ],
    }),
  ],
});
