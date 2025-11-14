from dotenv import load_dotenv

load_dotenv(override=True)

import asyncio
import logging
from pathlib import Path
from spoon_ai.agents.spoon_react_mcp import SpoonReactMCP
from spoon_ai.chat import ChatBot
from spoon_ai.tools import ToolManager
from spoon_ai.tools.base import BaseTool

logging.basicConfig(level=logging.INFO)


# Site Generator Tool
class SiteGeneratorTool(BaseTool):
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
        prompt_path = Path(__file__).parent / "generate-site.md"
        with open(prompt_path, "r") as f:
            return f.read()

    async def execute(
        self, requirements: str, site_type: str = "", style_preferences: str = ""
    ) -> str:
        """
        Generate a complete HTML website based on the requirements.
        Uses an LLM with the loaded system prompt to create the site.
        """
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

        # Generate the site using the agent's run method with system prompt
        try:
            # Load the system prompt
            system_prompt = self._load_system_prompt()

            # Create a temporary agent with the site generator system prompt
            site_agent = SpoonReactMCP(
                llm=llm,
                name="site_generator",
                system_prompt=system_prompt,
            )

            # Initialize with empty tools
            site_agent.avaliable_tools = ToolManager([])

            response = await site_agent.run(user_message)
            return response
        except Exception as e:
            return f"Error generating site: {str(e)}"


# Create your agent
class Neo0Agent(SpoonReactMCP):
    name: str = "neo-0"
    system_prompt: str = """You are a specialized website generation AI assistant built with SpoonOS framework.
Your primary expertise is creating complete, production-ready single-page websites.

**Your Capabilities:**
- Generate landing pages, portfolios, games, dashboards, and web applications
- Create modern, responsive designs with inline CSS and JavaScript
- Implement animations, gradients, and interactive features
- Build functional web games and interactive experiences

**How to Handle Requests:**
1. When a user describes what they want, analyze their requirements carefully
2. Extract key details: site type, features, design preferences, color schemes, functionality
3. Use the `generate_site` tool with comprehensive requirements
4. Always provide the complete HTML file ready for deployment

**Best Practices:**
- Ask clarifying questions if requirements are vague
- Suggest improvements or additional features that would enhance the site
- Ensure all generated sites are responsive and modern
- Include appropriate meta tags, accessibility features, and SEO basics

You are the expert in translating ideas into beautiful, functional websites.
"""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.avaliable_tools = ToolManager([])

    async def initialize(self, __context=None):
        """Initialize agent and load tools"""
        print("Initializing Neo0Agent and loading tools...")
        logging.info("Initializing Neo0Agent and loading tools...")

        # Initialize site generator tool
        site_tool = SiteGeneratorTool()
        self.avaliable_tools = ToolManager([site_tool])
        logging.info(f"Available tools: {list(self.avaliable_tools.tool_map.keys())}")


async def main():
    print("--- Neo0 Site Generator Agent Demo ---")
    logging.info("--- Neo0 Site Generator Agent Demo ---")

    # Initialize agent with LLM
    agent = Neo0Agent(
        llm=ChatBot(
            llm_provider="openrouter",
            model_name="anthropic/claude-haiku-4.5",
        )
    )

    logging.info("Agent instance created.")

    # Initialize the agent (load tools)
    await agent.initialize()

    logging.info("Agent ready for site generation tasks!")

    # Example usage - uncomment to test
    query = (
        "Create a landing page for a tech startup called 'NeoVibe' that builds AI agents. "
        "Include a hero section with a gradient background (purple to blue), "
        "a features section highlighting 3 key benefits, and a call-to-action button. "
        "Make it modern and animated."
    )
    logging.info(f"\nRunning query: {query}")
    response = await agent.run(query)
    logging.info(f"\n--- Site Generated ---\n{response}")
    return response


if __name__ == "__main__":
    result = asyncio.run(main())
