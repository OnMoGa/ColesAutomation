import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "coles",
  version: "1.0.0",
});

server.registerTool(
  "get_product_categories",
  {
    description: "Get a list of product categories",
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: `Product categories`,
        },
      ],
    };
  }
);
