"""Neo0Agent server - FastAPI application."""
from dotenv import load_dotenv

load_dotenv(override=True)

import warnings
import logging
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from mcp_server import handle_mcp_sse_get, handle_mcp_sse_post
from tools import GenerateSiteTool, ManageSiteFilesTool

warnings.filterwarnings("ignore", category=DeprecationWarning, module="websockets")

logging.basicConfig(level=logging.INFO)

# FastAPI app
app = FastAPI(title="Neo0Agent Server")

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
class ToolListResponse(BaseModel):
    tools: list[dict]


# API Routes
@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "name": "Neo0Agent Server",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/tools")
async def list_tools() -> ToolListResponse:
    """List available tools."""
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
            },
        ]
    )


@app.get("/sse")
async def mcp_sse_get(request: Request):
    """MCP SSE endpoint - GET for establishing SSE connection."""
    return await handle_mcp_sse_get(request)


@app.post("/sse")
async def mcp_sse_post(
    request: Request,
    x_connection_id: Optional[str] = Header(None, alias="X-Connection-ID"),
):
    """MCP SSE endpoint - POST for receiving JSON-RPC requests."""
    return await handle_mcp_sse_post(request, x_connection_id)


@app.get("/", response_class=HTMLResponse)
async def serve_test_page():
    """Serve the test HTML page."""
    main_file = Path(__file__).parent / "main.html"
    if not main_file.exists():
        raise HTTPException(status_code=404, detail="Main page not found")
    return main_file.read_text()


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
        headers={"Cache-Control": "no-cache", "X-Site-Metadata": json.dumps(metadata)},
    )


def main():
    """Main entry point for the server."""
    import uvicorn

    logging.info("Starting Neo0Agent Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
