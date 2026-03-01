"""Standalone MCP server for testing tools independently.

Run this script to start the MCP server on stdio.
Usage:
    python run_mcp.py
"""

from app.mcp.server import mcp

if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    mcp.run()
