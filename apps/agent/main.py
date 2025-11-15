"""Neo0Agent server - Starlette with MCP Streamable HTTP."""

from dotenv import load_dotenv
import warnings
import logging
from pathlib import Path
from starlette.applications import Starlette
from starlette.responses import HTMLResponse, Response
from starlette.routing import Route, Mount
from starlette.middleware.cors import CORSMiddleware
from mcp_server import mcp, GENERATED_SITES_DIR

load_dotenv(override=True)
warnings.filterwarnings("ignore", category=DeprecationWarning, module="websockets")
logging.basicConfig(level=logging.INFO)


# Health check endpoint
async def health(request):
    """Health check endpoint."""
    import json

    return Response(
        json.dumps(
            {
                "name": "Neo0Agent Server (MCP Streamable HTTP)",
                "version": "1.0.0",
                "status": "running",
            }
        ),
        media_type="application/json",
    )


# Serve test page
async def serve_test_page(request):
    """Serve the test HTML page."""
    main_file = Path(__file__).parent / "main.html"
    if not main_file.exists():
        return Response("Main page not found", status_code=404)
    return HTMLResponse(main_file.read_text())


# Serve generated site
async def serve_generated_site(request):
    """Serve a generated site's index.html file."""
    site_id = request.path_params['site_id']
    site_dir = GENERATED_SITES_DIR / site_id
    index_file = site_dir / "index.html"

    if not index_file.exists():
        return Response(f"Site '{site_id}' not found", status_code=404)

    return HTMLResponse(index_file.read_text())


# Create the MCP app using SSE transport
# This creates routes at /sse and /messages
mcp_app = mcp.sse_app()

# Create main Starlette app with routes
app = Starlette(
    debug=True,
    routes=[
        Route("/", serve_test_page),
        Route("/health", health),
        Route("/sites/{site_id}", serve_generated_site),
        # Mount MCP app at root so /sse and /messages endpoints are available
        Mount("/", mcp_app),
    ],
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def main():
    """Main entry point for the server."""
    import uvicorn

    logging.info("Starting Neo0Agent Server with MCP SSE...")
    logging.info("- MCP SSE endpoint: http://localhost:8000/sse")
    logging.info("- MCP messages endpoint: http://localhost:8000/messages")
    logging.info("- Test page: http://localhost:8000")
    logging.info("- Generated sites: http://localhost:8000/sites/{site_id}")
    logging.info("- stdio server: python run_mcp_server.py")

    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
