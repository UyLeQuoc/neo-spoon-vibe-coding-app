from pathlib import Path
from spoon_ai.chat import ChatBot
from spoon_ai.tools.base import BaseTool


class SiteGeneratorTool(BaseTool):
    """Tool for generating complete, production-ready single-page websites."""

    name: str = "generate_site"
    description: str = (
        "Generate a complete, production-ready single-page website as a standalone index.html file with all resources inlined. Use this to create landing pages, portfolios, games, dashboards, or web apps."
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
        """Load the system prompt from generate-site.md"""
        # Look for generate-site.md in the current directory (tools/)
        prompt_path = Path(__file__).parent / "generate-site.md"
        with open(prompt_path, "r") as f:
            return f.read()

    async def execute(
        self, requirements: str, site_type: str = "", style_preferences: str = ""
    ) -> str:
        """
        Generate a complete HTML website based on the requirements.
        Creates a simple agent just for site generation with the loaded system prompt.
        """
        from spoon_ai.agents.base import BaseAgent
        from spoon_ai.tools import ToolManager

        # Create a ChatBot instance for site generation
        llm = ChatBot(
            llm_provider="openrouter",
            model_name="anthropic/claude-sonnet-4",  # Use more powerful model for generation
            max_tokens=64000,  # Need larger output for complete HTML files
        )

        # Construct the user message
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
            site_agent = BaseAgent(
                llm=llm,
                name="site_generator",
                system_prompt=system_prompt,
            )

            response = await site_agent.run(user_message)
            return response
        except Exception as e:
            return f"Error generating site: {str(e)}"
