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
        "Returns a URL where the site can be viewed. Use this to create landing pages, "
        "portfolios, games, dashboards, or web apps from scratch."
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
        Saves the site to disk and returns a URL where it can be viewed.

        Returns:
            URL string (e.g., "http://localhost:8000/sites/20251115_143022")
            or error message on failure
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
                "head_section_added": False,
                "content_generated": False,
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
                return f"Error generating site: {error_msg} (step: {current_step})"

            # Check if verification passed
            if not final_state.get("verification_passed", False):
                # Site was created but verification failed - still return URL but log warning
                pass  # We'll still return the URL as the file exists

            # Save metadata
            metadata = {
                "site_id": site_id,
                "created_at": datetime.now().isoformat(),
                "requirements": requirements,
                "site_type": site_type,
                "style_preferences": style_preferences,
                "generation_method": "graph_system",
                "final_step": final_state.get("current_step", "unknown"),
                "verification_passed": final_state.get("verification_passed", False),
            }
            metadata_file = site_dir / "metadata.json"
            metadata_file.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

            # Return URL
            return f"http://localhost:8000/sites/{site_id}"

        except Exception as e:
            return f"Error generating site: {str(e)}"
