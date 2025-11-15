from dotenv import load_dotenv

load_dotenv(override=True)

import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, module="websockets")

import logging
import json
from typing import Optional
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from spoon_ai.chat import ChatBot

from agents import Neo0Agent
from tools.generate_site import GenerateSiteTool

logging.basicConfig(level=logging.INFO)

# FastAPI app
app = FastAPI(title="Neo0 Site Generator SSE Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory for generated sites
GENERATED_SITES_DIR = Path(__file__).parent / "generated_sites"


# Request/Response Models
class GenerateSiteRequest(BaseModel):
    requirements: str
    site_type: Optional[str] = ""
    style_preferences: Optional[str] = ""


class ToolListResponse(BaseModel):
    tools: list[dict]


# Global agent instance
agent_instance = None


async def get_agent():
    """Get or create the global agent instance."""
    global agent_instance
    if agent_instance is None:
        agent_instance = Neo0Agent(
            llm=ChatBot(
                llm_provider="openrouter",
                model_name="anthropic/claude-haiku-4.5",
            )
        )
        await agent_instance.initialize()
    return agent_instance


# SSE event generator
async def generate_sse_events(
    requirements: str,
    site_type: Optional[str] = "",
    style_preferences: Optional[str] = "",
):
    """Generate SSE events for site generation progress."""
    try:
        # Send start event
        yield f"event: start\ndata: {json.dumps({'status': 'started', 'message': 'Starting site generation...'})}\n\n"

        agent = await get_agent()

        # Construct query for the agent
        query = f"Requirements: {requirements}"
        if site_type:
            query = f"Site Type: {site_type}\n\n" + query
        if style_preferences:
            query += f"\n\nStyle Preferences: {style_preferences}"

        # Send processing event
        yield f"event: processing\ndata: {json.dumps({'status': 'processing', 'message': 'Generating website...'})}\n\n"

        # Run the agent
        response = await agent.run(query)

        # Send completion event with the result
        yield f"event: complete\ndata: {json.dumps({'status': 'complete', 'result': response})}\n\n"

    except Exception as e:
        logging.error(f"Error in generate_sse_events: {e}")
        yield f"event: error\ndata: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"


# API Routes
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "name": "Neo-0 Site Generator SSE Server",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/tools")
async def list_tools() -> ToolListResponse:
    """List available tools."""
    from tools import GenerateSiteTool, ManageSiteFilesTool

    generate_tool = GenerateSiteTool()
    manage_tool = ManageSiteFilesTool()

    return ToolListResponse(
        tools=[
            {
                "name": generate_tool.name,
                "description": generate_tool.description,
                "parameters": generate_tool.parameters,
            },
            {
                "name": manage_tool.name,
                "description": manage_tool.description,
                "parameters": manage_tool.parameters,
            }
        ]
    )


@app.get("/test", response_class=HTMLResponse)
async def serve_test_page():
    """Serve the test HTML page."""
    test_file = Path(__file__).parent / "test.html"
    if not test_file.exists():
        raise HTTPException(status_code=404, detail="Test page not found")
    return test_file.read_text()


@app.post("/generate")
async def generate_site_stream(request: GenerateSiteRequest):
    """Generate a website using SSE for real-time progress updates."""
    return StreamingResponse(
        generate_sse_events(
            requirements=request.requirements,
            site_type=request.site_type,
            style_preferences=request.style_preferences,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/sites/{site_id}", response_class=HTMLResponse)
async def serve_generated_site(site_id: str):
    """Serve generated site HTML file with metadata."""
    site_dir = GENERATED_SITES_DIR / site_id
    html_file = site_dir / "index.html"
    metadata_file = site_dir / "metadata.json"

    if not html_file.exists():
        raise HTTPException(status_code=404, detail=f"Site '{site_id}' not found")

    # Load metadata if available
    metadata = {}
    if metadata_file.exists():
        with open(metadata_file, "r") as f:
            metadata = json.load(f)

    # Read and return HTML content with metadata in headers
    html_content = html_file.read_text()

    return HTMLResponse(
        content=html_content,
        headers={
            "Cache-Control": "no-cache",
            "X-Site-Metadata": json.dumps(metadata)
        }
    )


def main():
    """Main entry point for the SSE server."""
    import uvicorn

    logging.info("Starting Neo-0 Site Generator SSE Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
