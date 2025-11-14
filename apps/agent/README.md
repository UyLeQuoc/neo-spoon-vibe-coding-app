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

### Quick Start

Run the setup script:

```bash
cd apps/agent
./start.sh
```

### Manual Installation

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

    ```bash
    cp .env.example .env
    # Edit .env and add your OPENROUTER_API_KEY
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

## Testing

Run the test client:

```bash
python test_sse.py
```

This will:

1. List available tools
2. Generate a sample website
3. Save the result to `generated_site.html`

Or test with curl:

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
const eventSource = new EventSource('http://localhost:8000/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requirements: 'Create a portfolio website',
    site_type: 'portfolio'
  })
});

eventSource.addEventListener('start', (e) => {
  console.log('Started:', JSON.parse(e.data));
});

eventSource.addEventListener('processing', (e) => {
  console.log('Processing:', JSON.parse(e.data));
});

eventSource.addEventListener('complete', (e) => {
  const data = JSON.parse(e.data);
  console.log('Complete! HTML:', data.result);
  eventSource.close();
});

eventSource.addEventListener('error', (e) => {
  console.error('Error:', JSON.parse(e.data));
  eventSource.close();
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
- `generate-site.md`: System prompt for site generation
- `test_sse.py`: Example client for testing

- `pyproject.toml`: Python dependencies
