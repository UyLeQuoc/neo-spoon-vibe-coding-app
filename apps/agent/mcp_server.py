"""MCP server implementation using the official Python SDK."""
import json
import logging
from pathlib import Path
from typing import Dict, Any

from mcp.server.fastmcp import FastMCP
from tools import GenerateSiteTool, ManageSiteFilesTool

# Create FastMCP server instance
mcp = FastMCP("Neo0Agent")

# Initialize tool instances
_generate_tool = GenerateSiteTool()
_manage_tool = ManageSiteFilesTool()

# Directory for generated sites
GENERATED_SITES_DIR = Path(__file__).parent / "generated_sites"


# Tools
@mcp.tool()
async def generate_site(
    requirements: str,
    site_type: str = "",
    style_preferences: str = "",
) -> str:
    """
    Generate a complete, production-ready single-page website.

    Args:
        requirements: Detailed requirements and specifications for the website
        site_type: Optional type of site (e.g., 'landing page', 'portfolio', 'game')
        style_preferences: Optional styling preferences like color scheme, animations, etc.

    Returns:
        JSON string with site information including site_id, url, and metadata
    """
    result = await _generate_tool.execute(
        requirements=requirements,
        site_type=site_type,
        style_preferences=style_preferences,
    )

    # Ensure result is a string (MCP tools return strings)
    if isinstance(result, dict):
        return json.dumps(result)

    return result


@mcp.tool()
async def manage_site_files(
    operation: str,
    site_id: str,
    file_path: str,
    content: str = "",
    old_string: str = "",
    new_string: str = "",
) -> str:
    """
    Manage files in generated sites - create, edit, read, or delete files.

    Args:
        operation: File operation (create_file, edit_file, read_file, delete_file)
        site_id: Unique site identifier (timestamp format: YYYYMMDD_HHMMSS)
        file_path: Relative path to file within site directory
        content: File content for create_file operation
        old_string: String to find and replace in edit_file operation
        new_string: Replacement string for edit_file operation

    Returns:
        JSON string with operation result
    """
    # Prepare arguments
    kwargs = {
        "operation": operation,
        "site_id": site_id,
        "file_path": file_path,
    }

    if operation == "create_file":
        kwargs["content"] = content
    elif operation == "edit_file":
        kwargs["old_string"] = old_string
        kwargs["new_string"] = new_string

    result = await _manage_tool.execute(**kwargs)

    # Ensure result is a string (MCP tools return strings)
    if isinstance(result, dict):
        return json.dumps(result)

    return result


# Resources - Expose generated sites
@mcp.resource("site://{site_id}/index.html")
def get_site_html(site_id: str) -> str:
    """
    Get the generated HTML file for a specific site.

    Args:
        site_id: Unique site identifier (timestamp format: YYYYMMDD_HHMMSS)

    Returns:
        HTML content of the generated site
    """
    site_dir = GENERATED_SITES_DIR / site_id
    html_file = site_dir / "index.html"

    if not html_file.exists():
        raise FileNotFoundError(f"Site '{site_id}' not found")

    return html_file.read_text()


@mcp.resource("site://{site_id}/metadata.json")
def get_site_metadata(site_id: str) -> str:
    """
    Get the metadata JSON file for a specific site.

    Args:
        site_id: Unique site identifier (timestamp format: YYYYMMDD_HHMMSS)

    Returns:
        JSON string with site metadata
    """
    site_dir = GENERATED_SITES_DIR / site_id
    metadata_file = site_dir / "metadata.json"

    if not metadata_file.exists():
        return json.dumps({"error": "Metadata not found"})

    return metadata_file.read_text()


# Export the mcp instance for use in main.py and SSE integration
__all__ = ["mcp", "GENERATED_SITES_DIR"]
