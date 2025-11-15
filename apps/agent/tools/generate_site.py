import json
from datetime import datetime
from pathlib import Path
from typing import TypedDict, Dict, Any, Optional, Annotated
from spoon_ai.chat import ChatBot
from spoon_ai.tools.base import BaseTool
from spoon_ai.tools import ToolManager
from spoon_ai.agents import ToolCallAgent
from .manage_site_files import ManageSiteFilesTool
from .graph_workflow import SiteGenerationGraph, SiteGenerationState


class GenerateSiteTool(BaseTool):
    """Tool for generating complete, production-ready single-page websites."""

    name: str = "generate_site"
    description: str = (
        "Generate a complete, production-ready single-page website and save it to disk. "
        "Returns structured JSON with site information including site_id (for use with manage_site_files), "
        "URL, requirements, and metadata. Use this to create landing pages, portfolios, games, "
        "dashboards, or web apps from scratch."
    )
    parameters: dict = {
        "type": "object",
        "properties": {
            "site_type": {
                "type": "string",
                "description": "Optional: Type of site to generate (e.g., 'landing page', 'portfolio', 'game', 'dashboard', 'web app'). If not specified, will be inferred from requirements.",
            },
            "requirements": {
                "type": "string",
                "description": "Detailed requirements and specifications for the website including features, design preferences, and functionality",
            },
            "style_preferences": {
                "type": "string",
                "description": "Optional styling preferences like color scheme, modern/minimal design, animations, etc.",
            },
        },
        "required": ["requirements"],
    }

    def _clean_html_content(self, content: str) -> str:
        """
        Remove markdown code block formatting from HTML content.

        Args:
            content: Raw content that may contain markdown code blocks

        Returns:
            Cleaned HTML content without markdown formatting
        """
        html_content = content.strip()

        # Remove opening code block markers
        if html_content.startswith("```html"):
            html_content = html_content[7:]  # Remove ```html
        elif html_content.startswith("```"):
            html_content = html_content[3:]  # Remove ```

        # Remove closing code block marker
        if html_content.endswith("```"):
            html_content = html_content[:-3]  # Remove trailing ```

        return html_content.strip()

    def _load_system_prompt(self) -> str:
        """Load the system prompt from generate_site_system_prompt.md"""
        prompt_path = Path(__file__).parent / "generate_site_system_prompt.md"
        with open(prompt_path, "r") as f:
            return f.read()

    async def execute(
        self, requirements: str, site_type: str = "", style_preferences: str = ""
    ) -> str:
        """
        Generate a complete HTML website based on the requirements.
        Saves the site to disk and returns structured JSON with site information.

        Returns:
            JSON string with structured site information including:
            - success: bool
            - site_id: str (timestamp format, can be used with manage_site_files)
            - url: str (viewing URL)
            - requirements: str (original requirements)
            - site_type: str
            - style_preferences: str
            - created_at: str (ISO timestamp)
            - verification_passed: bool
            - error: str (if any)
        """
        # Generate unique site_id with timestamp
        site_id = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Create site directory
        sites_dir = Path(__file__).parent.parent / "generated_sites"
        sites_dir.mkdir(parents=True, exist_ok=True)
        site_dir = sites_dir / site_id
        site_dir.mkdir(parents=True, exist_ok=True)

        # Create a ChatBot instance for site generation
        llm = ChatBot(
            llm_provider="openrouter",
            model_name="anthropic/claude-sonnet-4.5",
            max_tokens=64000,  # Need larger output for complete HTML files
        )

        # Generate the site using Graph System for structured workflow
        try:
            # Load the system prompt
            system_prompt = self._load_system_prompt()

            # Build graph workflow
            graph_builder = SiteGenerationGraph(llm, system_prompt)
            graph = graph_builder.build()
            compiled = graph.compile()

            # Initial state
            initial_state: SiteGenerationState = {
                "site_id": site_id,
                "site_dir": str(site_dir),
                "requirements": requirements,
                "site_type": site_type,
                "style_preferences": style_preferences,
                "current_step": "initialized",
                "html_skeleton_created": False,
                "content_generated": False,
                "content_ready": False,
                "generation_attempts": 0,
                "verification_passed": False,
                "error": None,
                "result": None,
                "memory": None,
            }

            # Execute graph workflow
            final_state = await compiled.invoke(initial_state)

            # Verify that index.html was created
            html_file = site_dir / "index.html"
            if not html_file.exists():
                error_msg = final_state.get("error", "Unknown error")
                current_step = final_state.get("current_step", "unknown")
                return json.dumps({
                    "success": False,
                    "site_id": site_id,
                    "url": None,
                    "requirements": requirements,
                    "site_type": site_type,
                    "style_preferences": style_preferences,
                    "created_at": datetime.now().isoformat(),
                    "verification_passed": False,
                    "error": f"{error_msg} (step: {current_step})",
                    "message": f"Site generation failed at step: {current_step}",
                }, indent=2)

            # Check if verification passed
            verification_passed = final_state.get("verification_passed", False)
            if not verification_passed:
                # Site was created but verification failed - still return URL but log warning
                pass  # We'll still return the structured data as the file exists

            # Save metadata
            metadata = {
                "site_id": site_id,
                "created_at": datetime.now().isoformat(),
                "requirements": requirements,
                "site_type": site_type,
                "style_preferences": style_preferences,
                "generation_method": "graph_system",
                "final_step": final_state.get("current_step", "unknown"),
                "verification_passed": verification_passed,
            }
            metadata_file = site_dir / "metadata.json"
            metadata_file.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

            # Return structured JSON response
            return json.dumps({
                "success": True,
                "site_id": site_id,
                "url": f"http://localhost:8000/sites/{site_id}",
                "requirements": requirements,
                "site_type": site_type,
                "style_preferences": style_preferences,
                "created_at": datetime.now().isoformat(),
                "verification_passed": verification_passed,
                "error": None,
                "message": f"Site generated successfully. Use site_id '{site_id}' with manage_site_files tool to update this site.",
            }, indent=2)

        except Exception as e:
            return json.dumps({
                "success": False,
                "site_id": None,
                "url": None,
                "requirements": requirements,
                "site_type": site_type,
                "style_preferences": style_preferences,
                "created_at": datetime.now().isoformat(),
                "verification_passed": False,
                "error": str(e),
                "message": f"Error generating site: {str(e)}",
            }, indent=2)
