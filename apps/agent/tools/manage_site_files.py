import json
from pathlib import Path
from typing import Optional
from spoon_ai.tools.base import BaseTool


class ManageSiteFilesTool(BaseTool):
    """Tool for managing files in generated sites - create, edit, read, or delete files."""

    name: str = "manage_site_files"
    description: str = (
        "Manage files in generated sites. Create new files, edit existing files (replace strings), "
        "read file content, or delete files. Use this to update or modify existing generated sites. "
        "IMPORTANT: When creating files with large content, ensure the JSON arguments are properly formatted and complete. "
        "For very large files, consider creating a basic structure first, then using edit_file to add content incrementally."
    )
    parameters: dict = {
        "type": "object",
        "properties": {
            "operation": {
                "type": "string",
                "enum": ["create_file", "edit_file", "read_file", "delete_file"],
                "description": "File operation to perform: create_file, edit_file (replace strings), read_file, or delete_file",
            },
            "site_id": {
                "type": "string",
                "description": "Unique site identifier (timestamp format: YYYYMMDD_HHMMSS)",
            },
            "file_path": {
                "type": "string",
                "description": "Relative path to file within site directory (e.g., 'index.html', 'styles.css')",
            },
            "content": {
                "type": "string",
                "description": "File content for create_file operation. Required for create_file. For large files, ensure JSON is properly escaped and complete.",
            },
            "old_string": {
                "type": "string",
                "description": "String to find and replace in edit_file operation. Required for edit_file. CRITICAL: Keep this SHORT (under 200 characters) to avoid JSON truncation. Use a unique, small identifier like a comment, a single line, or a short unique string. For large replacements, break into multiple smaller edits.",
            },
            "new_string": {
                "type": "string",
                "description": "Replacement string for edit_file operation. Required for edit_file. Can be longer than old_string, but if very long, consider breaking into multiple edits.",
            },
        },
        "required": ["operation", "site_id", "file_path"],
    }

    def _get_sites_dir(self) -> Path:
        """Get the generated sites directory."""
        sites_dir = Path(__file__).parent.parent / "generated_sites"
        sites_dir.mkdir(parents=True, exist_ok=True)
        return sites_dir

    async def execute(
        self,
        operation: Optional[str] = None,
        site_id: Optional[str] = None,
        file_path: Optional[str] = None,
        content: Optional[str] = None,
        old_string: Optional[str] = None,
        new_string: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Execute file management operation.

        Returns JSON string with operation result including success status,
        file paths, URLs, and any relevant messages.
        """
        # Handle arguments passed as kwargs (from JSON parsing)
        if operation is None:
            operation = kwargs.get("operation")
        if site_id is None:
            site_id = kwargs.get("site_id")
        if file_path is None:
            file_path = kwargs.get("file_path")
        if content is None:
            content = kwargs.get("content")
        if old_string is None:
            old_string = kwargs.get("old_string")
        if new_string is None:
            new_string = kwargs.get("new_string")
        
        # Validate required arguments
        if not operation or not site_id or not file_path:
            error_msg = (
                f"Missing required arguments. "
                f"operation={operation}, site_id={site_id}, file_path={file_path}. "
                f"This usually means the JSON arguments were incomplete or malformed. "
                f"Try creating files incrementally: first create a small skeleton, then use edit_file to add content."
            )
            return json.dumps({
                "success": False,
                "error": error_msg,
                "received_kwargs": str(kwargs) if kwargs else "No kwargs received"
            }, indent=2)
        
        try:
            sites_dir = self._get_sites_dir()
            site_dir = sites_dir / site_id
            absolute_file_path = site_dir / file_path

            result = {
                "success": False,
                "operation": operation,
                "site_id": site_id,
                "file_path": file_path,
                "absolute_path": str(absolute_file_path),
                "url": f"http://localhost:8000/sites/{site_id}",
                "message": None,
                "error": None,
            }

            if operation == "create_file":
                return await self._create_file(site_dir, absolute_file_path, content, result)

            elif operation == "edit_file":
                # Validate old_string length to prevent JSON truncation
                if old_string and len(old_string) > 200:
                    result["error"] = (
                        f"old_string is too long ({len(old_string)} characters). "
                        f"Keep it under 200 characters to prevent JSON truncation. "
                        f"Use a shorter unique identifier like a comment or single line, "
                        f"or break the edit into multiple smaller edits."
                    )
                    return json.dumps(result, indent=2)
                return await self._edit_file(absolute_file_path, old_string, new_string, result)

            elif operation == "read_file":
                return await self._read_file(absolute_file_path, result)

            elif operation == "delete_file":
                return await self._delete_file(absolute_file_path, result)

            else:
                result["error"] = f"Unknown operation: {operation}"
                return json.dumps(result, indent=2)

        except Exception as e:
            return json.dumps({
                "success": False,
                "operation": operation,
                "site_id": site_id,
                "file_path": file_path,
                "error": str(e),
            }, indent=2)

    async def _create_file(self, site_dir: Path, file_path: Path, content: Optional[str], result: dict) -> str:
        """Create a new file with content."""
        if content is None:
            result["error"] = "content parameter is required for create_file operation"
            return json.dumps(result, indent=2)

        # Create site directory if it doesn't exist
        site_dir.mkdir(parents=True, exist_ok=True)

        # Create parent directories for the file if needed
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Check if file already exists
        if file_path.exists():
            result["error"] = f"File already exists: {file_path.name}"
            result["message"] = "Use edit_file operation to modify existing files"
            return json.dumps(result, indent=2)

        # Write content to file
        file_path.write_text(content, encoding="utf-8")

        result["success"] = True
        result["message"] = f"File '{file_path.name}' created successfully"
        return json.dumps(result, indent=2)

    async def _edit_file(self, file_path: Path, old_string: Optional[str], new_string: Optional[str], result: dict) -> str:
        """Edit a file by replacing old_string with new_string."""
        if old_string is None or new_string is None:
            result["error"] = "old_string and new_string parameters are required for edit_file operation"
            return json.dumps(result, indent=2)

        if not file_path.exists():
            result["error"] = f"File not found: {file_path.name}"
            return json.dumps(result, indent=2)

        # Read current content
        current_content = file_path.read_text(encoding="utf-8")

        # Count occurrences
        occurrence_count = current_content.count(old_string)

        if occurrence_count == 0:
            result["error"] = "old_string not found in file"
            result["message"] = "No replacements made"
            return json.dumps(result, indent=2)

        # Replace all occurrences
        new_content = current_content.replace(old_string, new_string)

        # Write updated content
        file_path.write_text(new_content, encoding="utf-8")

        result["success"] = True
        result["message"] = f"Replaced {occurrence_count} occurrence(s) in '{file_path.name}'"
        return json.dumps(result, indent=2)

    async def _read_file(self, file_path: Path, result: dict) -> str:
        """Read and return file content."""
        if not file_path.exists():
            result["error"] = f"File not found: {file_path.name}"
            return json.dumps(result, indent=2)

        # Read content
        content = file_path.read_text(encoding="utf-8")

        result["success"] = True
        result["content"] = content
        result["message"] = f"Read {len(content)} characters from '{file_path.name}'"
        return json.dumps(result, indent=2)

    async def _delete_file(self, file_path: Path, result: dict) -> str:
        """Delete a file."""
        if not file_path.exists():
            result["error"] = f"File not found: {file_path.name}"
            return json.dumps(result, indent=2)

        # Delete the file
        file_path.unlink()

        result["success"] = True
        result["message"] = f"File '{file_path.name}' deleted successfully"
        return json.dumps(result, indent=2)
