"""
Graph workflow for structured site generation using SpoonOS Graph System.

This module defines the graph-based workflow for multi-step site generation,
providing better orchestration, error handling, and state management.
"""

import json
from typing import TypedDict, Dict, Any, Optional, Annotated
from spoon_ai.chat import ChatBot
from spoon_ai.tools import ToolManager
from spoon_ai.agents import ToolCallAgent
from spoon_ai.graph import (
    StateGraph,
    END,
)
from spoon_ai.graph.builder import (
    DeclarativeGraphBuilder,
    GraphTemplate,
    NodeSpec,
    EdgeSpec,
    GraphConfig,
)
from .manage_site_files import ManageSiteFilesTool


class SiteGenerationState(TypedDict):
    """State for site generation workflow"""

    site_id: str
    site_dir: str
    requirements: str
    site_type: str
    style_preferences: str
    current_step: str
    html_skeleton_created: bool
    head_section_added: bool
    content_generated: bool
    verification_passed: bool
    error: Optional[str]
    result: Optional[str]
    memory: Annotated[Optional[Dict[str, Any]], None]


class SiteGenerationGraph:
    """Graph-based workflow for site generation"""

    def __init__(self, llm: ChatBot, system_prompt: str):
        self.llm = llm
        self.system_prompt = system_prompt
        self.file_tool = ManageSiteFilesTool()

    def _create_skeleton_node(self) -> callable:
        """Create node function for HTML skeleton creation"""

        async def create_skeleton(
            state: SiteGenerationState, config: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """Create basic HTML skeleton with placeholders"""
            skeleton = """<!DOCTYPE html>
<html lang="en">
<head>
    <!-- HEAD_PLACEHOLDER -->
</head>
<body>
    <div id="root"></div>
    <!-- CONTENT_PLACEHOLDER -->
</body>
</html>"""

            result = await self.file_tool.execute(
                operation="create_file",
                site_id=state["site_id"],
                file_path="index.html",
                content=skeleton,
            )

            result_data = json.loads(result) if isinstance(result, str) else result
            success = result_data.get("success", False)

            return {
                "html_skeleton_created": success,
                "current_step": "skeleton_created",
                "result": result if success else None,
                "error": None if success else result_data.get("error", "Unknown error"),
            }

        return create_skeleton

    def _add_head_section_node(self) -> callable:
        """Create node function for adding head section"""

        async def add_head_section(
            state: SiteGenerationState, config: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """Add head section with meta tags and CDN links"""
            head_content = """    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Generated site">
    <title>Generated Site</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>"""

            result = await self.file_tool.execute(
                operation="edit_file",
                site_id=state["site_id"],
                file_path="index.html",
                old_string="    <!-- HEAD_PLACEHOLDER -->",
                new_string=head_content,
            )

            result_data = json.loads(result) if isinstance(result, str) else result
            success = result_data.get("success", False)

            return {
                "head_section_added": success,
                "current_step": "head_added",
                "result": result if success else None,
                "error": None if success else result_data.get("error", "Unknown error"),
            }

        return add_head_section

    def _generate_content_node(self) -> callable:
        """Create node function for LLM-based content generation"""

        async def generate_content(
            state: SiteGenerationState, config: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """Use ToolCallAgent to generate React components and content"""
            # Create agent with file management tools
            agent = ToolCallAgent(
                llm=self.llm,
                name="content_generator",
                system_prompt=self.system_prompt,
                available_tools=ToolManager([ManageSiteFilesTool()]),
                max_steps=15,  # More steps for content generation
            )
            agent._default_timeout = 600

            # Construct prompt for content generation
            prompt = f"""Requirements: {state.get('requirements', '')}
Site Type: {state.get('site_type', '')}
Style Preferences: {state.get('style_preferences', '')}

The HTML skeleton has been created with placeholders. Your task is to:
1. Replace <!-- CONTENT_PLACEHOLDER --> with complete React components
2. Add all necessary styling, components, and functionality
3. Ensure the site is production-ready

IMPORTANT:
- Use manage_site_files tool with site_id: {state['site_id']}
- Keep old_string SHORT (under 200 chars) to avoid JSON truncation
- Use <!-- CONTENT_PLACEHOLDER --> as the old_string
- Build incrementally if needed (create, read, edit in steps)
- Ensure React 18+ and TailwindCSS 4+ are used (already in head)

Generate a complete, production-ready website."""

            try:
                result = await agent.run(prompt)
                return {
                    "content_generated": True,
                    "current_step": "content_generated",
                    "result": str(result),
                    "error": None,
                }
            except Exception as e:
                return {
                    "content_generated": False,
                    "current_step": "content_generation_failed",
                    "result": None,
                    "error": str(e),
                }

        return generate_content

    def _verify_site_node(self) -> callable:
        """Create node function for site verification"""

        async def verify_site(
            state: SiteGenerationState, config: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """Verify the site was created correctly"""
            result = await self.file_tool.execute(
                operation="read_file", site_id=state["site_id"], file_path="index.html"
            )

            result_data = json.loads(result) if isinstance(result, str) else result
            content = result_data.get("content", "")

            # Check requirements
            has_react = (
                "React" in content or "react" in content or "ReactDOM" in content
            )
            has_tailwind = "tailwindcss" in content.lower() or "@tailwindcss" in content
            has_root = '<div id="root">' in content or '<div id="root">' in content
            has_content = len(content) > 500  # Reasonable minimum size

            verification_passed = bool(
                content and has_react and has_tailwind and has_root and has_content
            )

            return {
                "verification_passed": verification_passed,
                "current_step": (
                    "verified" if verification_passed else "verification_failed"
                ),
                "result": result,
                "error": (
                    None
                    if verification_passed
                    else "Site verification failed: missing required components"
                ),
            }

        return verify_site

    def build(self) -> StateGraph:
        """Build and return the site generation graph"""
        # Create node functions
        create_skeleton = self._create_skeleton_node()
        add_head_section = self._add_head_section_node()
        generate_content = self._generate_content_node()
        verify_site = self._verify_site_node()

        # Define nodes
        nodes = [
            NodeSpec("create_skeleton", create_skeleton),
            NodeSpec("add_head_section", add_head_section),
            NodeSpec("generate_content", generate_content),
            NodeSpec("verify_site", verify_site),
        ]

        # Define edges (linear workflow)
        edges = [
            EdgeSpec("create_skeleton", "add_head_section"),
            EdgeSpec("add_head_section", "generate_content"),
            EdgeSpec("generate_content", "verify_site"),
            EdgeSpec("verify_site", END),
        ]

        # Configure graph
        config = GraphConfig(max_iterations=20)

        # Create template
        template = GraphTemplate(
            entry_point="create_skeleton",
            nodes=nodes,
            edges=edges,
            parallel_groups=[],
            config=config,
        )

        # Build graph
        builder = DeclarativeGraphBuilder(SiteGenerationState)
        graph = builder.build(template)

        return graph
