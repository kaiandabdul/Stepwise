"""
HoneyHive MCP Server - Tools Implementation
Provides observability and tracing functions using HoneyHive SDK
"""

import os
import uuid
from honeyhive import HoneyHive
from datetime import datetime
from typing import Optional, Dict, Any

# Load environment variables
HONEYHIVE_API_KEY = os.getenv("HONEYHIVE_API_KEY")
HONEYHIVE_PROJECT = os.getenv("HONEYHIVE_PROJECT", "stepwise-agent")

if not HONEYHIVE_API_KEY:
    raise ValueError("HONEYHIVE_API_KEY not set in environment")

# Initialize HoneyHive client
hh = HoneyHive(bearer_auth=HONEYHIVE_API_KEY)


async def create_trace(
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
    try:
        # Generate unique trace ID
        trace_id = str(uuid.uuid4())

        # Use trace_id as session_id if not provided
        if session_id is None:
            session_id = trace_id

        # Create trace in HoneyHive
        response = hh.traces.create(
            project=HONEYHIVE_PROJECT,
            name=trace_name,
            trace_id=trace_id,
            session_id=session_id,
            metadata=metadata or {},
            timestamp=datetime.utcnow().isoformat()
        )

        return {
            "success": True,
            "trace_id": trace_id,
            "message": f"Trace '{trace_name}' created successfully",
            "response": response
        }
    except Exception as e:
        return {
            "success": False,
            "trace_id": None,
            "error": str(e),
            "message": f"Failed to create trace: {str(e)}"
        }


async def log_event(
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
    try:
        response = hh.events.log(
            project=HONEYHIVE_PROJECT,
            trace_id=trace_id,
            event_name=event_name,
            event_type=level,
            metadata=metadata or {},
            timestamp=datetime.utcnow().isoformat()
        )

        return {
            "success": True,
            "message": f"Event '{event_name}' logged successfully to trace {trace_id}",
            "response": response
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to log event: {str(e)}"
        }


async def log_metric(
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
    try:
        response = hh.metrics.log(
            project=HONEYHIVE_PROJECT,
            trace_id=trace_id,
            metric_name=metric_name,
            value=value,
            tags=tags or {},
            timestamp=datetime.utcnow().isoformat()
        )

        return {
            "success": True,
            "message": f"Metric '{metric_name}' = {value} logged successfully to trace {trace_id}",
            "response": response
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to log metric: {str(e)}"
        }


async def end_trace(
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
    try:
        response = hh.traces.end(
            project=HONEYHIVE_PROJECT,
            trace_id=trace_id,
            status=status,
            metadata=metadata or {},
            timestamp=datetime.utcnow().isoformat()
        )

        return {
            "success": True,
            "message": f"Trace {trace_id} ended with status: {status}",
            "response": response
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": f"Failed to end trace: {str(e)}"
        }
