"""Run the MCP server using the official Python SDK."""
from mcp_server import mcp

if __name__ == "__main__":
    # Run the MCP server
    # By default, FastMCP uses stdio transport
    mcp.run()

