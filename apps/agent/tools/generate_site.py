import json
from datetime import datetime
from pathlib import Path
from spoon_ai.chat import ChatBot
from spoon_ai.tools.base import BaseTool
from spoon_ai.tools import ToolManager
from spoon_ai.agents import ToolCallAgent


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

        # Construct the user message with all requirements
        user_message = "Requirements:\n" + requirements

        if site_type:
            user_message = f"Site Type: {site_type}\n\n" + user_message

        if style_preferences:
            user_message += f"\n\nStyle Preferences:\n{style_preferences}"

        user_message += """

Please generate a complete, production-ready index.html file following all the guidelines in the system prompt.
Output ONLY the HTML code without any explanations or markdown formatting.
"""

        # Generate the site using a simple agent
        try:
            # Load the system prompt
            system_prompt = self._load_system_prompt()

            # Create a simple agent just for this generation task
            site_agent = ToolCallAgent(
                llm=llm,
                name="site_generator",
                system_prompt=system_prompt,
                available_tools=ToolManager([]),
            )

            # Generate HTML
            agent_result = await site_agent.run(user_message)

            # Extract HTML content from agent result
            # Remove markdown code blocks if present
            html_content = agent_result.strip()
            if html_content.startswith("```html"):
                html_content = html_content[7:]  # Remove ```html
            elif html_content.startswith("```"):
                html_content = html_content[3:]  # Remove ```

            if html_content.endswith("```"):
                html_content = html_content[:-3]  # Remove trailing ```

            html_content = html_content.strip()

            # Save HTML to disk
            html_file = site_dir / "index.html"
            html_file.write_text(html_content, encoding="utf-8")

            # Save metadata
            metadata = {
                "site_id": site_id,
                "created_at": datetime.now().isoformat(),
                "requirements": requirements,
                "site_type": site_type,
                "style_preferences": style_preferences,
            }
            metadata_file = site_dir / "metadata.json"
            metadata_file.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

            # Return URL
            return f"http://localhost:8000/sites/{site_id}"

        except Exception as e:
            return f"Error generating site: {str(e)}"
