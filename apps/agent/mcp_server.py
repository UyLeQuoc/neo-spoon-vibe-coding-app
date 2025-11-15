"""MCP server implementation for Neo0Agent."""
import json
import logging
import asyncio
import uuid
from typing import Dict, Any, Optional
from collections import defaultdict
from fastapi import Request
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from tools import GenerateSiteTool, ManageSiteFilesTool


# MCP Protocol Models
class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[str | int] = None
    method: str
    params: Optional[Dict[str, Any]] = None


# MCP SSE message queues for each connection
mcp_sse_queues: Dict[str, asyncio.Queue] = defaultdict(asyncio.Queue)


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
        },
    ]


async def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool by name with given arguments."""
    if tool_name == "generate_site":
        tool = GenerateSiteTool()
        result = await tool.execute(
            requirements=arguments.get("requirements", ""),
            site_type=arguments.get("site_type", ""),
            style_preferences=arguments.get("style_preferences", ""),
        )
        return {"content": [{"type": "text", "text": result}]}
    elif tool_name == "manage_site_files":
        tool = ManageSiteFilesTool()
        result = await tool.execute(**arguments)
        return {"content": [{"type": "text", "text": result}]}
    else:
        raise ValueError(f"Unknown tool: {tool_name}")


async def process_mcp_request(mcp_request: MCPRequest) -> Dict[str, Any]:
    """Process an MCP JSON-RPC request and return the response."""
    # Handle MCP protocol methods
    if mcp_request.method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": mcp_request.id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "neo0-agent", "version": "1.0.0"},
            },
        }

    elif mcp_request.method == "tools/list":
        tools = get_mcp_tools()
        return {"jsonrpc": "2.0", "id": mcp_request.id, "result": {"tools": tools}}

    elif mcp_request.method == "tools/call":
        tool_name = mcp_request.params.get("name") if mcp_request.params else None
        arguments = (
            mcp_request.params.get("arguments", {}) if mcp_request.params else {}
        )

        if not tool_name:
            return {
                "jsonrpc": "2.0",
                "id": mcp_request.id,
                "error": {"code": -32602, "message": "Tool name is required"},
            }

        try:
            result = await execute_tool(tool_name, arguments)
            return {"jsonrpc": "2.0", "id": mcp_request.id, "result": result}
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": mcp_request.id,
                "error": {"code": -32603, "message": f"Tool execution error: {str(e)}"},
            }

    else:
        return {
            "jsonrpc": "2.0",
            "id": mcp_request.id,
            "error": {
                "code": -32601,
                "message": f"Method not found: {mcp_request.method}",
            },
        }


async def mcp_sse_stream(connection_id: str):
    """Generate SSE stream for MCP server."""
    try:
        # Send connection ID as initial event
        yield f"event: connection\ndata: {json.dumps({'connectionId': connection_id})}\n\n"

        # Keep connection alive and process messages from queue
        while True:
            try:
                # Wait for a message with timeout to send keepalive
                try:
                    message = await asyncio.wait_for(
                        mcp_sse_queues[connection_id].get(), timeout=30.0
                    )
                    # Send JSON-RPC response as SSE data
                    yield f"data: {json.dumps(message)}\n\n"
                    mcp_sse_queues[connection_id].task_done()
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
            "error": {"code": -32603, "message": f"Internal error: {str(e)}"},
        }
        yield f"data: {json.dumps(error_response)}\n\n"
    finally:
        # Clean up queue when connection closes
        if connection_id in mcp_sse_queues:
            del mcp_sse_queues[connection_id]
            logging.info(f"Cleaned up SSE connection: {connection_id}")


async def handle_mcp_sse_get(request: Request) -> StreamingResponse:
    """Handle GET request for MCP SSE endpoint."""
    # Generate a unique connection ID
    connection_id = str(uuid.uuid4())

    # Create a queue for this connection
    queue = asyncio.Queue()
    mcp_sse_queues[connection_id] = queue

    return StreamingResponse(
        mcp_sse_stream(connection_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Connection-ID": connection_id,
        },
    )


async def handle_mcp_sse_post(
    request: Request, x_connection_id: Optional[str] = None
) -> JSONResponse:
    """Handle POST request for MCP SSE endpoint."""
    try:
        body = await request.json()

        # Check if this is a valid MCP request
        if not isinstance(body, dict) or "jsonrpc" not in body or "method" not in body:
            response = {
                "jsonrpc": "2.0",
                "id": body.get("id") if isinstance(body, dict) else None,
                "error": {
                    "code": -32600,
                    "message": "Invalid Request: This endpoint expects MCP protocol requests.",
                },
            }
            return JSONResponse(response, status_code=400)

        mcp_request = MCPRequest(**body)

        # Process the request and get response
        response = await process_mcp_request(mcp_request)

        # Send response via SSE to the matching connection
        if x_connection_id and x_connection_id in mcp_sse_queues:
            try:
                await mcp_sse_queues[x_connection_id].put(response)
                logging.debug(f"Sent response to connection: {x_connection_id}")
            except Exception as e:
                logging.error(f"Error sending to SSE queue {x_connection_id}: {e}")
        elif mcp_sse_queues:
            # Send to all active SSE connections
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
            "error": {"code": -32603, "message": f"Internal error: {str(e)}"},
        }
        return JSONResponse(response, status_code=500)

