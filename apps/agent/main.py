from dotenv import load_dotenv

load_dotenv(override=True)

import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, module="websockets")

import logging
import json
import asyncio
import uuid
from typing import Optional, Dict, Any
from pathlib import Path
from collections import defaultdict
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from spoon_ai.chat import ChatBot

from agents import Neo0Agent
from tools.generate_site import GenerateSiteTool
from tools.manage_site_files import ManageSiteFilesTool

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


# MCP Protocol Models
class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[str | int] = None
    method: str
    params: Optional[Dict[str, Any]] = None


class MCPResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[str | int] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None


# Global agent instance
agent_instance = None

# MCP SSE message queues for each connection
mcp_sse_queues: Dict[str, asyncio.Queue] = defaultdict(asyncio.Queue)


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


# MCP Protocol Endpoints
def get_mcp_tools() -> list[dict]:
    """Get MCP-formatted tool list."""
    generate_tool = GenerateSiteTool()
    manage_tool = ManageSiteFilesTool()
    
    return [
        {
            "name": generate_tool.name,
            "description": generate_tool.description,
            "inputSchema": generate_tool.parameters,
        },
        {
            "name": manage_tool.name,
            "description": manage_tool.description,
            "inputSchema": manage_tool.parameters,
        }
    ]


async def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool by name with given arguments."""
    if tool_name == "generate_site":
        tool = GenerateSiteTool()
        result = await tool.execute(
            requirements=arguments.get("requirements", ""),
            site_type=arguments.get("site_type", ""),
            style_preferences=arguments.get("style_preferences", "")
        )
        return {"content": [{"type": "text", "text": result}]}
    elif tool_name == "manage_site_files":
        tool = ManageSiteFilesTool()
        result = await tool.execute(**arguments)
        return {"content": [{"type": "text", "text": result}]}
    else:
        raise ValueError(f"Unknown tool: {tool_name}")


@app.get("/sse")
async def mcp_sse_endpoint(request: Request):
    """MCP SSE endpoint for establishing SSE connection and streaming JSON-RPC responses."""
    # Generate a unique connection ID
    connection_id = str(uuid.uuid4())
    
    # Create a queue for this connection
    queue = asyncio.Queue()
    mcp_sse_queues[connection_id] = queue
    
    async def mcp_sse_stream():
        try:
            # Send connection ID as initial event so client knows its connection ID
            yield f"event: connection\ndata: {json.dumps({'connectionId': connection_id})}\n\n"
            
            # Keep connection alive and process messages from queue
            while True:
                try:
                    # Wait for a message with timeout to send keepalive
                    try:
                        message = await asyncio.wait_for(queue.get(), timeout=30.0)
                        # Send JSON-RPC response as SSE data
                        yield f"data: {json.dumps(message)}\n\n"
                        queue.task_done()
                    except asyncio.TimeoutError:
                        # Send keepalive comment
                        yield f": keepalive\n\n"
                except asyncio.CancelledError:
                    break
        except Exception as e:
            logging.error(f"Error in MCP SSE stream: {e}")
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                }
            }
            yield f"data: {json.dumps(error_response)}\n\n"
        finally:
            # Clean up queue when connection closes
            if connection_id in mcp_sse_queues:
                del mcp_sse_queues[connection_id]
                logging.info(f"Cleaned up SSE connection: {connection_id}")
    
    return StreamingResponse(
        mcp_sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Connection-ID": connection_id,  # Also send in header for easier access
        },
    )


@app.post("/sse")
async def mcp_sse_post_endpoint(
    request: Request,
    x_connection_id: Optional[str] = Header(None, alias="X-Connection-ID")
):
    """MCP SSE POST endpoint for receiving JSON-RPC requests."""
    try:
        body = await request.json()
        
        # Check if this is a valid MCP request
        if not isinstance(body, dict) or "jsonrpc" not in body or "method" not in body:
            response = {
                "jsonrpc": "2.0",
                "id": body.get("id") if isinstance(body, dict) else None,
                "error": {
                    "code": -32600,
                    "message": "Invalid Request: This endpoint expects MCP protocol requests."
                }
            }
            return JSONResponse(response, status_code=400)
        
        mcp_request = MCPRequest(**body)
        
        # Process the request and get response
        response = await process_mcp_request(mcp_request)
        
        # For SSE transport, send the response via SSE to the matching connection
        # If connection_id is provided, send to that specific connection
        # Otherwise, send to all active connections (client will filter by JSON-RPC id)
        if x_connection_id and x_connection_id in mcp_sse_queues:
            # Send to specific connection
            try:
                await mcp_sse_queues[x_connection_id].put(response)
                logging.debug(f"Sent response to connection: {x_connection_id}")
            except Exception as e:
                logging.error(f"Error sending to SSE queue {x_connection_id}: {e}")
        elif mcp_sse_queues:
            # Send to all active SSE connections (client will match by JSON-RPC id)
            for conn_id, queue in mcp_sse_queues.items():
                try:
                    await queue.put(response)
                    logging.debug(f"Sent response to connection: {conn_id}")
                except Exception as e:
                    logging.error(f"Error sending to SSE queue {conn_id}: {e}")
        
        # Also return HTTP response for compatibility/fallback
        return JSONResponse(response)
    
    except Exception as e:
        logging.error(f"Error handling MCP SSE POST request: {e}")
        response = {
            "jsonrpc": "2.0",
            "id": None,
            "error": {
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            }
        }
        return JSONResponse(response, status_code=500)


async def process_mcp_request(mcp_request: MCPRequest) -> Dict[str, Any]:
    """Process an MCP JSON-RPC request and return the response."""
    # Handle MCP protocol methods
    if mcp_request.method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": mcp_request.id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "neo0-site-generator",
                    "version": "1.0.0"
                }
            }
        }
    
    elif mcp_request.method == "tools/list":
        tools = get_mcp_tools()
        return {
            "jsonrpc": "2.0",
            "id": mcp_request.id,
            "result": {
                "tools": tools
            }
        }
    
    elif mcp_request.method == "tools/call":
        tool_name = mcp_request.params.get("name") if mcp_request.params else None
        arguments = mcp_request.params.get("arguments", {}) if mcp_request.params else {}
        
        if not tool_name:
            return {
                "jsonrpc": "2.0",
                "id": mcp_request.id,
                "error": {
                    "code": -32602,
                    "message": "Tool name is required"
                }
            }
        
        try:
            result = await execute_tool(tool_name, arguments)
            return {
                "jsonrpc": "2.0",
                "id": mcp_request.id,
                "result": result
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": mcp_request.id,
                "error": {
                    "code": -32603,
                    "message": f"Tool execution error: {str(e)}"
                }
            }
    
    else:
        return {
            "jsonrpc": "2.0",
            "id": mcp_request.id,
            "error": {
                "code": -32601,
                "message": f"Method not found: {mcp_request.method}"
            }
        }


@app.post("/generate")
async def mcp_http_endpoint(request: Request):
    """MCP HTTP endpoint for handling JSON-RPC requests (fallback for HTTP transport)."""
    try:
        body = await request.json()
        
        # Check if this is a valid MCP request (has jsonrpc and method fields)
        if not isinstance(body, dict) or "jsonrpc" not in body or "method" not in body:
            # Not an MCP request - return error
            response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32600,
                    "message": "Invalid Request: This endpoint expects MCP protocol requests. Use /generate-site for legacy site generation."
                }
            }
            return JSONResponse(response, status_code=400)
        
        mcp_request = MCPRequest(**body)
        response = await process_mcp_request(mcp_request)
        return JSONResponse(response)
    
    except Exception as e:
        logging.error(f"Error handling MCP request: {e}")
        response = {
            "jsonrpc": "2.0",
            "id": None,
            "error": {
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            }
        }
        return JSONResponse(response, status_code=500)


@app.get("/test", response_class=HTMLResponse)
async def serve_test_page():
    """Serve the test HTML page."""
    test_file = Path(__file__).parent / "test.html"
    if not test_file.exists():
        raise HTTPException(status_code=404, detail="Test page not found")
    return test_file.read_text()


@app.post("/generate-site")
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
