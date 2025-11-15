# Neo0 Site Generator SSE Server

A Server-Sent Events (SSE) API server that generates complete, production-ready single-page websites using AI.

## Features

- **SSE Streaming**: Real-time progress updates via Server-Sent Events
- **RESTful API**: Simple HTTP endpoints for easy integration
- **AI-powered**: Uses SpoonOS framework with Claude Sonnet for intelligent site generation
- **Complete HTML output**: Generates standalone index.html files with inlined resources
- **Versatile**: Create landing pages, portfolios, games, dashboards, and web apps
- **CORS enabled**: Works with any frontend application

## Installation

1. Install dependencies using uv:

    ```bash
    cd apps/agent
    uv pip install -e .
    ```

    Or using pip:

    ```bash
    pip install -e .
    ```

2. Set up your environment variables in `.env`:

    Create a `.env` file in the `apps/agent` directory and add your `OPENROUTER_API_KEY`:

    ```bash
    OPENROUTER_API_KEY=your_api_key_here
    ```

## Running the SSE Server

Run the server using Python:

```bash
python main.py
```

The server will start on `http://localhost:8000`.

## API Endpoints

### `GET /`

Health check endpoint.

**Response:**

```json
{
  "name": "Neo0 Site Generator SSE Server",
  "version": "1.0.0",
  "status": "running"
}
```

### `GET /tools`

List available tools and their schemas.

**Response:**

```json
{
  "tools": [
    {
      "name": "generate_site",
      "description": "...",
      "parameters": {...}
    }
  ]
}
```

### `POST /generate`

Generate a website with real-time progress updates via SSE.

**Request Body:**

```json
{
  "requirements": "Create a landing page for a tech startup...",
  "site_type": "landing page",
  "style_preferences": "Modern, purple to blue gradient"
}
```

**Response:** Server-Sent Events stream with the following event types:

- `start`: Generation started
- `processing`: Currently generating
- `complete`: Generation finished (includes the HTML in the result field)
- `error`: An error occurred

**Example SSE Response:**

```text
event: start
data: {"status": "started", "message": "Starting site generation..."}

event: processing
data: {"status": "processing", "message": "Generating website..."}

event: complete
data: {"status": "complete", "result": "<html>...</html>"}
```

### `GET /test`

Serve the test HTML page for interactive testing.

**Response:** HTML page with a form to test the site generation API.

Open `http://localhost:8000/test` in your browser to access the test interface.

### `GET /sites/{site_id}`

Serve a generated site by its ID.

**Path Parameters:**

- `site_id` (required): The ID of the generated site (e.g., `20251115_111521`)

**Response:** HTML content of the generated site.

**Headers:**

- `X-Site-Metadata`: JSON metadata about the site (if available)

**Example:**

```bash
curl http://localhost:8000/sites/20251115_111521
```

## Testing

### Using the Test HTML Page

The easiest way to test the API is using the built-in test page:

1. Start the server:

    ```bash
    python main.py
    ```

2. Open your browser and navigate to:

    ```
    http://localhost:8000/test
    ```

3. Use the interactive form to:
   - Select a predefined prompt or enter custom requirements
   - Specify site type and style preferences
   - Generate a website and see real-time progress updates
   - View the generated HTML result

### Using curl

```bash
# List tools
curl http://localhost:8000/tools

# Generate a site (streaming)
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": "Create a simple landing page for a coffee shop",
    "site_type": "landing page",
    "style_preferences": "Warm colors, modern design"
  }'
```

## Client Integration

### JavaScript/TypeScript Example

```typescript
async function generateSite() {
  const response = await fetch('http://localhost:8000/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requirements: 'Create a portfolio website',
      site_type: 'portfolio',
      style_preferences: 'modern, minimalist'
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const [eventLine, dataLine] = line.split('\n');
      const eventType = eventLine.replace('event: ', '').trim();
      const data = JSON.parse(dataLine.replace('data: ', ''));

      switch (eventType) {
        case 'start':
          console.log('Started:', data);
          break;
        case 'processing':
          console.log('Processing:', data);
          break;
        case 'complete':
          console.log('Complete! HTML:', data.result);
          return data.result;
        case 'error':
          console.error('Error:', data);
          throw new Error(data.message);
      }
    }
  }
}

// Usage
generateSite().then(html => {
  console.log('Generated HTML:', html);
}).catch(error => {
  console.error('Generation failed:', error);
});
```

### Python Example

```python
import httpx
import json

async def generate_site():
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            "http://localhost:8000/generate",
            json={
                "requirements": "Create a gaming website",
                "site_type": "landing page"
            },
            timeout=300.0
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("event:"):
                    event_type = line.split(":", 1)[1].strip()
                elif line.startswith("data:"):
                    data = json.loads(line.split(":", 1)[1])
                    if data.get("status") == "complete":
                        return data["result"]
```

## Available Tools

### `generate_site`

Generate a complete, production-ready single-page website.

**Parameters:**

- `requirements` (required): Detailed requirements and specifications for the website
- `site_type` (optional): Type of site (e.g., 'landing page', 'portfolio', 'game')
- `style_preferences` (optional): Styling preferences like color scheme, animations, etc.

**Example:**

```md
Create a landing page for a tech startup called 'NeoVibe' that builds AI agents.
Include a hero section with a gradient background (purple to blue),
a features section highlighting 3 key benefits, and a call-to-action button.
Make it modern and animated.
```

## Architecture

- **FastAPI**: Modern async web framework with SSE support
- **SpoonOS Framework**: Leverages the SpoonAI SDK for agent orchestration
- **Claude Integration**: Uses Anthropic's Claude models via OpenRouter
- **Streaming**: Real-time progress updates via Server-Sent Events
- **Modular Design**: Clean separation between agent logic and API endpoints

## Development

The server consists of:

- `main.py`: FastAPI SSE server implementation
- `agents/`: Agent implementations and system prompts
- `tools/`: Tool implementations for site generation
  - `generate_site.py`: Site generation tool
  - `generate_site_system_prompt.md`: System prompt for site generation
  - `manage_site_files.py`: File management tool
- `test.html`: Interactive test page for the API
- `generated_sites/`: Directory where generated sites are stored
- `pyproject.toml`: Python dependencies
