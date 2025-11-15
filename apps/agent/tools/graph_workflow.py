"""
Graph workflow for structured site generation using SpoonOS Graph System.

This module defines the graph-based workflow for multi-step site generation,
providing better orchestration, error handling, and state management.
"""

import json
from typing import TypedDict, Dict, Any, Optional, Annotated
from spoon_ai.chat import ChatBot, Memory
from spoon_ai.tools import ToolManager
from spoon_ai.agents import ToolCallAgent
from spoon_ai.graph import (
    StateGraph,
    END,
    ConditionNode,
)
from spoon_ai.schema import AgentState
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
    content_generated: bool
    content_ready: bool  # Flag to indicate if content generation is complete
    generation_attempts: int  # Counter for generation attempts
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

    def _create_skeleton_from_template_node(self) -> callable:
        """Create node function that loads template.html and initializes the site"""

        async def create_skeleton_from_template(
            state: SiteGenerationState, config: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """Load template.html and replace placeholders with initial values"""
            from pathlib import Path

            # Load the template
            template_path = Path(__file__).parent / "template.html"
            if not template_path.exists():
                return {
                    "html_skeleton_created": False,
                    "current_step": "template_not_found",
                    "result": None,
                    "error": f"Template file not found: {template_path}",
                }

            template_content = template_path.read_text(encoding="utf-8")

            # Determine page title from site_type or requirements
            site_type = state.get("site_type", "").strip()
            requirements = state.get("requirements", "").strip()

            if site_type:
                page_title = f"{site_type.title()} - Generated Site"
            elif requirements:
                # Extract a short title from requirements (first 50 chars)
                page_title = f"{requirements[:50].strip()}..." if len(requirements) > 50 else requirements.strip()
            else:
                page_title = "Generated Site"

            # Replace page title placeholder
            template_content = template_content.replace(
                "<!--========[PAGE_TITLE_HERE]========-->",
                page_title
            )

            # Replace extra head content placeholder (empty by default, can be filled later if needed)
            template_content = template_content.replace(
                "<!--========[EXTRA_HEAD_CONTENT_HERE]========-->",
                ""
            )

            # Keep APP_CONTENT_HERE placeholder for content generation step
            # The template already has it in place

            # Create the file with the template
            result = await self.file_tool.execute(
                operation="create_file",
                site_id=state["site_id"],
                file_path="index.html",
                content=template_content,
            )

            result_data = json.loads(result) if isinstance(result, str) else result
            success = result_data.get("success", False)

            return {
                "html_skeleton_created": success,
                "current_step": "skeleton_created",
                "result": result if success else None,
                "error": None if success else result_data.get("error", "Unknown error"),
            }

        return create_skeleton_from_template

    def _generate_content_node(self) -> callable:
        """Create node function for LLM-based content generation"""

        async def generate_content(
            state: SiteGenerationState, config: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """Use ToolCallAgent to generate React components and content"""
            # Increment generation attempts
            current_attempts = state.get("generation_attempts", 0) + 1
            max_attempts = 3  # Allow up to 3 attempts

            # Create agent with file management tools
            agent = ToolCallAgent(
                llm=self.llm,
                name="content_generator",
                system_prompt=self.system_prompt,
                available_tools=ToolManager([ManageSiteFilesTool()]),
                max_steps=15,  # More steps for content generation
            )
            agent._default_timeout = 600
            # Ensure memory is completely clean for fresh agent instance
            # Create a brand new Memory instance to avoid any state leakage
            agent.memory = Memory()
            agent.memory.clear()  # Double-check it's empty
            agent.tool_calls = []
            agent.current_step = 0
            agent.state = AgentState.IDLE

            # Verify memory is actually empty (defensive check)
            if agent.memory.get_messages():
                # If memory has messages, something is wrong - clear it again
                agent.memory.clear()

            # Check if this is a retry attempt
            is_retry = current_attempts > 1
            retry_instruction = ""
            if is_retry:
                retry_instruction = f"\n\nNOTE: This is attempt {current_attempts} of {max_attempts}. "
                retry_instruction += "Please review the existing content and improve it. "
                retry_instruction += "Check for any missing features, broken functionality, or incomplete sections. "
                retry_instruction += "Read the current file first to see what's already there, then enhance it."

            # Construct prompt for content generation
            prompt = f"""Requirements: {state.get('requirements', '')}
Site Type: {state.get('site_type', '')}
Style Preferences: {state.get('style_preferences', '')}

The HTML template has been created with ESM module support. Your task is to:
1. Replace // ========[APP_CONTENT_HERE]======== with complete React components
2. Replace the SampleApp placeholder component with your actual App component
3. Use ES6 import syntax (already set up: import React, {{ useState, useEffect }} from "react")
4. Add all necessary styling with TailwindCSS, components, and functionality
5. Ensure the site is production-ready
{retry_instruction}
CRITICAL - When calling manage_site_files tool, you MUST include ALL required parameters:
- operation: "create_file", "edit_file", "read_file", or "delete_file" (REQUIRED)
- site_id: "{state['site_id']}" (REQUIRED - use this exact value)
- file_path: "index.html" or other file path (REQUIRED)
- For edit_file: old_string (REQUIRED, keep under 500 chars) and new_string (REQUIRED)
- For create_file: content (REQUIRED)

Example tool call format:
{{
  "operation": "edit_file",
  "site_id": "{state['site_id']}",
  "file_path": "index.html",
  "old_string": "// ========[APP_CONTENT_HERE]========",
  "new_string": "// Your actual components\\nconst App = () => {{ /* ... */ }};"
}}

IMPORTANT RULES:
- Template uses ESM imports via import map with version pinning - use standard import/export syntax
- ALWAYS include operation, site_id, and file_path in EVERY tool call
- Keep old_string SHORT (under 500 chars) to avoid JSON truncation
- Use // ========[APP_CONTENT_HERE]======== as the old_string for the first edit
- Replace SampleApp with your actual App component
- Update the render call to use your component name
- If you need additional libraries, add them to import map using jsdelivr ESM format WITH VERSION: https://cdn.jsdelivr.net/npm/[package]@[version]/+esm
- CRITICAL: Always include version numbers in import map URLs (e.g., @19.2.0, @3.12.5)
- CRITICAL: Related packages must use matching versions (e.g., react@19.2.0 and react-dom@19.2.0 must match)
- Build incrementally if needed (read file first, then edit in steps)
- React 19.2.0 and TailwindCSS are already loaded via ESM and CDN with proper versioning

Generate a complete, production-ready website using modern ESM syntax with version-pinned dependencies."""

            try:
                result = await agent.run(prompt)
                # Mark content as generated, but not necessarily ready
                # The check_content_ready node will determine if we need another pass
                return {
                    "content_generated": True,
                    "generation_attempts": current_attempts,
                    "current_step": "content_generated",
                    "result": str(result),
                    "error": None,
                }
            except Exception as e:
                error_msg = str(e)
                # If we've reached max attempts, mark as ready to proceed anyway
                content_ready = current_attempts >= max_attempts
                return {
                    "content_generated": False,
                    "generation_attempts": current_attempts,
                    "content_ready": content_ready,
                    "current_step": "content_generation_failed",
                    "result": None,
                    "error": error_msg,
                }

        return generate_content

    def _check_content_ready_node(self) -> callable:
        """Create a router node to check if content generation is complete"""

        async def check_content_ready(
            state: SiteGenerationState, config: Optional[Dict[str, Any]] = None
        ) -> Dict[str, Any]:
            """Check if content is ready or if we need another generation pass"""
            generation_attempts = state.get("generation_attempts", 0)
            max_attempts = 3

            # Read the current file to check if content placeholder is still there
            result = await self.file_tool.execute(
                operation="read_file", site_id=state["site_id"], file_path="index.html"
            )

            result_data = json.loads(result) if isinstance(result, str) else result
            content = result_data.get("content", "")

            # Check if placeholder is still present (content not fully generated)
            placeholder_present = "// ========[APP_CONTENT_HERE]========" in content
            sample_app_present = "SampleApp" in content and "This is template content" in content
            has_react = "import React" in content or "from \"react\"" in content or "from 'react'" in content
            has_content = len(content) > 500  # Reasonable minimum size

            # Content is ready if:
            # 1. Placeholder is gone (replaced with actual content)
            # 2. SampleApp placeholder is gone (replaced with actual app)
            # 3. Has React ESM imports
            # 4. Has sufficient content
            # 5. OR we've reached max attempts
            content_ready = (
                not placeholder_present and not sample_app_present and has_react and has_content
            ) or generation_attempts >= max_attempts

            # Route decision: "continue_generation" or "proceed_to_verify"
            next_step = "proceed_to_verify" if content_ready else "continue_generation"

            return {
                "content_ready": content_ready,
                "current_step": next_step,
            }

        return check_content_ready

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

            # Check requirements for ESM-based template
            has_react_imports = "import React" in content or "from \"react\"" in content or "from 'react'" in content
            has_createroot = "createRoot" in content
            has_tailwind = "tailwindcss" in content.lower() or "@tailwindcss" in content
            has_root = '<div id="root">' in content or '<div id="root">' in content
            has_importmap = "importmap" in content or "type=\"importmap\"" in content
            has_content = len(content) > 500  # Reasonable minimum size
            no_placeholder = "// ========[APP_CONTENT_HERE]========" not in content
            no_sample_app = not ("SampleApp" in content and "This is template content" in content)

            verification_passed = bool(
                content and has_react_imports and has_createroot and has_tailwind
                and has_root and has_importmap and has_content and no_placeholder and no_sample_app
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

    def _route_to_continue_generation(self) -> callable:
        """Create a condition function that returns True if we should continue generation"""

        def should_continue_generation(state: SiteGenerationState) -> bool:
            """Return True if we should continue generating content, False to proceed to verification"""
            content_ready = state.get("content_ready", False)
            generation_attempts = state.get("generation_attempts", 0)
            max_attempts = 3

            # Continue generation if content is not ready AND we haven't reached max attempts
            return not content_ready and generation_attempts < max_attempts

        return should_continue_generation

    def _route_to_verify(self) -> callable:
        """Create a condition function that returns True if we should proceed to verification"""

        def should_verify(state: SiteGenerationState) -> bool:
            """Return True if we should proceed to verification, False to continue generation"""
            content_ready = state.get("content_ready", False)
            generation_attempts = state.get("generation_attempts", 0)
            max_attempts = 3

            # Proceed to verification if content is ready OR we've reached max attempts
            return content_ready or generation_attempts >= max_attempts

        return should_verify

    def build(self) -> StateGraph:
        """Build and return the site generation graph"""
        # Create node functions
        create_skeleton_from_template = self._create_skeleton_from_template_node()
        generate_content = self._generate_content_node()
        check_content_ready = self._check_content_ready_node()
        verify_site = self._verify_site_node()
        should_continue = self._route_to_continue_generation()
        should_verify = self._route_to_verify()

        # Define nodes
        nodes = [
            NodeSpec("create_skeleton_from_template", create_skeleton_from_template),
            NodeSpec("generate_content", generate_content),
            NodeSpec("check_content_ready", check_content_ready),
            NodeSpec("verify_site", verify_site),
        ]

        # Define edges with conditional routing
        # After check_content_ready, route conditionally based on content_ready flag
        # Create a router node that selects the next step based on state
        def route_after_check(state: SiteGenerationState) -> str:
            """Router function to determine next step after content check"""
            content_ready = state.get("content_ready", False)
            generation_attempts = state.get("generation_attempts", 0)
            max_attempts = 3

            if content_ready or generation_attempts >= max_attempts:
                return "verify_site"
            else:
                return "generate_content"

        # Use ConditionNode for conditional routing if supported, otherwise use both edges
        # Try using a simple router pattern with both edges
        # The graph system should handle routing based on the condition functions
        edges = [
            EdgeSpec("create_skeleton_from_template", "generate_content"),
            EdgeSpec("generate_content", "check_content_ready"),
            # Add both possible routes - the graph system or condition functions will handle routing
            # If EdgeSpec supports condition, use it; otherwise both edges will be evaluated
            EdgeSpec("check_content_ready", "generate_content", condition=should_continue),
            EdgeSpec("check_content_ready", "verify_site", condition=should_verify),
            EdgeSpec("verify_site", END),
        ]

        # Configure graph with more iterations to allow multiple content generation passes
        config = GraphConfig(max_iterations=30)  # Increased to allow multiple generation attempts

        # Create template
        template = GraphTemplate(
            entry_point="create_skeleton_from_template",
            nodes=nodes,
            edges=edges,
            parallel_groups=[],
            config=config,
        )

        # Build graph
        builder = DeclarativeGraphBuilder(SiteGenerationState)
        graph = builder.build(template)

        return graph
