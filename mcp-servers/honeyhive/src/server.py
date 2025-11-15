"""
HoneyHive MCP Server
Provides observability and tracing tools via Model Context Protocol (MCP)
"""

import os
from fastmcp import FastMCP
from dotenv import load_dotenv
from typing import Optional, Dict, Any
from tools import create_trace, log_event, log_metric, end_trace

# Load environment variables
load_dotenv()

# Initialize FastMCP server
mcp = FastMCP(
    "honeyhive-mcp-server",
    port=int(os.getenv("PORT", 8001))
)


@mcp.tool()
async def create_trace_tool(
    trace_name: str,
    session_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a new trace for workflow execution in HoneyHive.

    Args:
        trace_name: Name/description of the trace
        session_id: Optional session ID to group related traces
        metadata: Optional metadata dictionary

    Returns:
        Dictionary with success status, trace_id, and message
    """
    return await create_trace(trace_name, session_id, metadata)


@mcp.tool()
async def log_event_tool(
    event_name: str,
    trace_id: str,
    metadata: Optional[Dict[str, Any]] = None,
    level: str = "info"
) -> Dict[str, Any]:
    """
    Log an event in an existing HoneyHive trace.

    Args:
        event_name: Name/description of the event
        trace_id: Trace ID to associate this event with
        metadata: Optional metadata dictionary
        level: Event severity level (info, warn, error)

    Returns:
        Dictionary with success status and message
    """
    return await log_event(event_name, trace_id, metadata, level)


@mcp.tool()
async def log_metric_tool(
    metric_name: str,
    value: float,
    trace_id: str,
    tags: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Log a metric value to HoneyHive trace.

    Args:
        metric_name: Name of the metric
        value: Numeric value to log
        trace_id: Trace ID to associate this metric with
        tags: Optional tags dictionary

    Returns:
        Dictionary with success status and message
    """
    return await log_metric(metric_name, value, trace_id, tags)


@mcp.tool()
async def end_trace_tool(
    trace_id: str,
    status: str = "success",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Complete a HoneyHive trace.

    Args:
        trace_id: Trace ID to end
        status: Final status (success, error, cancelled)
        metadata: Optional final metadata

    Returns:
        Dictionary with success status and message
    """
    return await end_trace(trace_id, status, metadata)


@mcp.server.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "honeyhive-mcp",
        "port": int(os.getenv("PORT", 8001)),
        "project": os.getenv("HONEYHIVE_PROJECT", "stepwise-agent")
    }


if __name__ == "__main__":
    print(f"Starting HoneyHive MCP Server on port {os.getenv('PORT', 8001)}...")
    print(f"HoneyHive Project: {os.getenv('HONEYHIVE_PROJECT', 'stepwise-agent')}")
    mcp.run()
