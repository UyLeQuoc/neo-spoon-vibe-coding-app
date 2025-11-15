"""Agent instance management module."""
import logging
from agents import Neo0Agent
from spoon_ai.chat import ChatBot

# Global agent instance
_agent_instance = None


async def get_agent():
    """Get or create the global agent instance."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = Neo0Agent(
            llm=ChatBot(
                llm_provider="openrouter",
                model_name="anthropic/claude-haiku-4.5",
            )
        )
        await _agent_instance.initialize()
    return _agent_instance

