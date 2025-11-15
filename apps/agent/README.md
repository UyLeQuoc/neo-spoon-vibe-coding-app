# Neo0Agent - MCP Site Generator

MCP (Model Context Protocol) server that generates production-ready websites using AI. Built with the [official MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk).

## Installation

```bash
pip install "mcp[server]"
# or with uv
uv add "mcp[server]"
```

## Usage

### stdio Server (Claude Desktop, Cursor)

```bash
python run_mcp_server.py
```

### SSE Server (web clients)

```bash
python main.py
```

Server runs on `http://localhost:8000` with:
- MCP SSE endpoint at `/sse`
- Generated sites at `/sites/{site_id}`

## MCP Features

### Tools

- **`generate_site`** - Generate complete websites
- **`manage_site_files`** - Manage site files

### Resources

- **`site://{site_id}/index.html`** - Generated HTML
- **`site://{site_id}/metadata.json`** - Site metadata

## Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "neo0-agent": {
      "command": "python",
      "args": ["/path/to/apps/agent/run_mcp_server.py"]
    }
  }
}
```

### TypeScript Client

```typescript
import { experimental_createMCPClient } from '@ai-sdk/mcp'

// stdio transport (for Claude Desktop, Cursor)
const client = await experimental_createMCPClient({
  transport: {
    type: 'stdio',
    command: 'python',
    args: ['/path/to/run_mcp_server.py']
  }
})

// SSE transport (for web clients)
const client = await experimental_createMCPClient({
  transport: {
    type: 'sse',
    url: 'http://localhost:8000/sse'
  }
})

// IMPORTANT: tools() returns an object, not an array!
const tools = await client.tools() // { generate_site: {...}, manage_site_files: {...} }

// Access tools by name:
const generateTool = tools.generate_site
const result = await generateTool.execute({ requirements: "..." })

// Or pass directly to streamText (Vercel AI SDK):
import { streamText } from 'ai'
const result = streamText({
  tools: await client.tools(), // Object format works here
  // ...
})
```

## Environment

Create `.env` file:

```bash
OPENROUTER_API_KEY=your_api_key_here
```

## Testing

Open the browser test page at `http://localhost:8000` after starting the server with `python main.py`.

## Architecture

```
MCP Clients ──stdio/SSE──> FastMCP Server (Starlette)
                                ├─ @mcp.tool() generate_site
                                ├─ @mcp.tool() manage_site_files
                                ├─ @mcp.resource() site://{id}/index.html
                                └─ @mcp.resource() site://{id}/metadata.json
```

## Important Notes

### Tools Object vs Array

The `@ai-sdk/mcp` client returns tools as an **object** (dictionary) with tool names as keys, not an array:

```javascript
const tools = await client.tools()
// Returns: { toolName: { description, execute, ... }, ... }
// NOT: [{ name: "toolName", ... }]
```

This means:
- ❌ **DON'T** use array methods: `tools.find()`, `tools.map()`, etc.
- ✅ **DO** access by key: `tools.generate_site`, `Object.keys(tools)`, etc.
- ✅ **DO** pass directly to Vercel AI SDK's `streamText()` (expects object format)

## References

- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP Specification](https://modelcontextprotocol.io)
