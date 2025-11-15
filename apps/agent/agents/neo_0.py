import logging
from pathlib import Path
# from spoon_ai.agents.spoon_react_mcp import SpoonReactMCP
from spoon_ai.agents import SpoonReactAI
from spoon_ai.tools import ToolManager

from tools import GenerateSiteTool, ManageSiteFilesTool


class Neo0Agent(SpoonReactAI):
    """
    Specialized website generation AI assistant built with SpoonOS framework.
    Expert in creating complete, production-ready single-page websites.
    """

    name: str = "neo-0"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.available_tools = ToolManager([])


    def _load_system_prompt(self) -> str:
        """Load the system prompt from neo_0_system_prompt.md"""
        prompt_path = Path(__file__).parent / "neo_0_system_prompt.md"
        with open(prompt_path, "r") as f:
            return f.read()

    async def initialize(self, __context=None):
        """Initialize agent and load tools"""
        logging.info("Initializing Neo0Agent and loading tools...")

        # Initialize site generator and file management tools
        self.system_prompt = self._load_system_prompt()
        self._default_timeout = 600  # 10 minutes
        self.available_tools = ToolManager([
            GenerateSiteTool(),
            ManageSiteFilesTool()
        ])
        logging.info(f"Available tools: {list(self.available_tools.tool_map.keys())}")

