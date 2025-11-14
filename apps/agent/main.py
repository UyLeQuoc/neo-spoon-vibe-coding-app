from dotenv import load_dotenv

load_dotenv(override=True)

import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, module="websockets")

import logging
import json
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from spoon_ai.chat import ChatBot

from agents import Neo0Agent
from tools.site_generator import SiteGeneratorTool

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
        "name": "Neo0 Site Generator SSE Server",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/tools")
async def list_tools() -> ToolListResponse:
    """List available tools."""
    tool = SiteGeneratorTool()
    return ToolListResponse(
        tools=[
            {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters,
            }
        ]
    )


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


def main():
    """Main entry point for the SSE server."""
    import uvicorn

    logging.info("Starting Neo-0 Site Generator SSE Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
