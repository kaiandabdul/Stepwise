"""
Unit tests for HoneyHive MCP Server tools
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


@pytest.fixture
def mock_honeyhive():
    """Fixture to mock HoneyHive client"""
    with patch('tools.hh') as mock:
        yield mock


@pytest.mark.asyncio
async def test_create_trace_success(mock_honeyhive):
    """Test successful trace creation"""
    from tools import create_trace

    # Setup mock response
    mock_response = {"id": "test-trace-123", "status": "created"}
    mock_honeyhive.traces.create.return_value = mock_response

    # Execute
    result = await create_trace("test-workflow", "session-123", {"test": "data"})

    # Verify
    assert result["success"] is True
    assert "trace_id" in result
    assert result["trace_id"] is not None
    assert "Trace 'test-workflow' created successfully" in result["message"]

    # Verify HoneyHive was called correctly
    mock_honeyhive.traces.create.assert_called_once()
    call_args = mock_honeyhive.traces.create.call_args[1]
    assert call_args["project"] == "stepwise-agent"
    assert call_args["name"] == "test-workflow"
    assert call_args["session_id"] == "session-123"
    assert call_args["metadata"] == {"test": "data"}


@pytest.mark.asyncio
async def test_create_trace_with_default_session(mock_honeyhive):
    """Test trace creation with auto-generated session_id"""
    from tools import create_trace

    mock_honeyhive.traces.create.return_value = {"id": "trace-123"}

    result = await create_trace("test-workflow")

    # Verify session_id defaults to trace_id
    call_args = mock_honeyhive.traces.create.call_args[1]
    assert call_args["session_id"] == call_args["trace_id"]


@pytest.mark.asyncio
async def test_create_trace_error_handling(mock_honeyhive):
    """Test trace creation error handling"""
    from tools import create_trace

    # Setup mock to raise exception
    mock_honeyhive.traces.create.side_effect = Exception("API Error")

    # Execute
    result = await create_trace("test-workflow")

    # Verify error response
    assert result["success"] is False
    assert result["trace_id"] is None
    assert "error" in result
    assert "API Error" in result["error"]


@pytest.mark.asyncio
async def test_log_event_success(mock_honeyhive):
    """Test successful event logging"""
    from tools import log_event

    mock_response = {"id": "event-123", "status": "logged"}
    mock_honeyhive.events.log.return_value = mock_response

    result = await log_event(
        "api-call-completed",
        "trace-123",
        {"endpoint": "/api/users"},
        "info"
    )

    # Verify
    assert result["success"] is True
    assert "Event 'api-call-completed' logged successfully" in result["message"]

    # Verify HoneyHive was called correctly
    call_args = mock_honeyhive.events.log.call_args[1]
    assert call_args["project"] == "stepwise-agent"
    assert call_args["trace_id"] == "trace-123"
    assert call_args["event_name"] == "api-call-completed"
    assert call_args["event_type"] == "info"
    assert call_args["metadata"] == {"endpoint": "/api/users"}


@pytest.mark.asyncio
async def test_log_event_with_defaults(mock_honeyhive):
    """Test event logging with default values"""
    from tools import log_event

    mock_honeyhive.events.log.return_value = {"id": "event-123"}

    result = await log_event("test-event", "trace-123")

    # Verify defaults
    call_args = mock_honeyhive.events.log.call_args[1]
    assert call_args["event_type"] == "info"
    assert call_args["metadata"] == {}


@pytest.mark.asyncio
async def test_log_event_error_handling(mock_honeyhive):
    """Test event logging error handling"""
    from tools import log_event

    mock_honeyhive.events.log.side_effect = Exception("Logging failed")

    result = await log_event("test-event", "trace-123")

    assert result["success"] is False
    assert "error" in result
    assert "Logging failed" in result["error"]


@pytest.mark.asyncio
async def test_log_metric_success(mock_honeyhive):
    """Test successful metric logging"""
    from tools import log_metric

    mock_response = {"id": "metric-123", "status": "logged"}
    mock_honeyhive.metrics.log.return_value = mock_response

    result = await log_metric(
        "response_time",
        123.45,
        "trace-123",
        {"endpoint": "/api/users"}
    )

    # Verify
    assert result["success"] is True
    assert "Metric 'response_time' = 123.45 logged successfully" in result["message"]

    # Verify HoneyHive was called correctly
    call_args = mock_honeyhive.metrics.log.call_args[1]
    assert call_args["project"] == "stepwise-agent"
    assert call_args["trace_id"] == "trace-123"
    assert call_args["metric_name"] == "response_time"
    assert call_args["value"] == 123.45
    assert call_args["tags"] == {"endpoint": "/api/users"}


@pytest.mark.asyncio
async def test_log_metric_with_defaults(mock_honeyhive):
    """Test metric logging with default values"""
    from tools import log_metric

    mock_honeyhive.metrics.log.return_value = {"id": "metric-123"}

    result = await log_metric("test_metric", 42.0, "trace-123")

    # Verify defaults
    call_args = mock_honeyhive.metrics.log.call_args[1]
    assert call_args["tags"] == {}


@pytest.mark.asyncio
async def test_log_metric_error_handling(mock_honeyhive):
    """Test metric logging error handling"""
    from tools import log_metric

    mock_honeyhive.metrics.log.side_effect = Exception("Metric logging failed")

    result = await log_metric("test_metric", 42.0, "trace-123")

    assert result["success"] is False
    assert "error" in result
    assert "Metric logging failed" in result["error"]


@pytest.mark.asyncio
async def test_end_trace_success(mock_honeyhive):
    """Test successful trace ending"""
    from tools import end_trace

    mock_response = {"id": "trace-123", "status": "completed"}
    mock_honeyhive.traces.end.return_value = mock_response

    result = await end_trace(
        "trace-123",
        "success",
        {"total_duration": 5.2}
    )

    # Verify
    assert result["success"] is True
    assert "Trace trace-123 ended with status: success" in result["message"]

    # Verify HoneyHive was called correctly
    call_args = mock_honeyhive.traces.end.call_args[1]
    assert call_args["project"] == "stepwise-agent"
    assert call_args["trace_id"] == "trace-123"
    assert call_args["status"] == "success"
    assert call_args["metadata"] == {"total_duration": 5.2}


@pytest.mark.asyncio
async def test_end_trace_with_defaults(mock_honeyhive):
    """Test trace ending with default values"""
    from tools import end_trace

    mock_honeyhive.traces.end.return_value = {"id": "trace-123"}

    result = await end_trace("trace-123")

    # Verify defaults
    call_args = mock_honeyhive.traces.end.call_args[1]
    assert call_args["status"] == "success"
    assert call_args["metadata"] == {}


@pytest.mark.asyncio
async def test_end_trace_error_handling(mock_honeyhive):
    """Test trace ending error handling"""
    from tools import end_trace

    mock_honeyhive.traces.end.side_effect = Exception("Failed to end trace")

    result = await end_trace("trace-123")

    assert result["success"] is False
    assert "error" in result
    assert "Failed to end trace" in result["error"]


@pytest.mark.asyncio
async def test_trace_id_is_uuid(mock_honeyhive):
    """Test that generated trace IDs are valid UUIDs"""
    from tools import create_trace

    mock_honeyhive.traces.create.return_value = {"id": "trace-123"}

    result = await create_trace("test-workflow")

    # Verify trace_id is a valid UUID
    trace_id = result["trace_id"]
    assert trace_id is not None
    # Should not raise ValueError
    uuid.UUID(trace_id)


@pytest.mark.asyncio
async def test_timestamps_are_iso_format(mock_honeyhive):
    """Test that timestamps are in ISO format"""
    from tools import create_trace

    mock_honeyhive.traces.create.return_value = {"id": "trace-123"}

    result = await create_trace("test-workflow")

    # Verify timestamp is ISO format
    call_args = mock_honeyhive.traces.create.call_args[1]
    timestamp = call_args["timestamp"]
    # Should not raise ValueError
    datetime.fromisoformat(timestamp)


def test_honeyhive_api_key_required():
    """Test that HONEYHIVE_API_KEY is required"""
    # This test verifies the import-time check
    # The actual validation happens when tools.py is imported
    # We're just verifying the environment variable is set
    assert os.getenv("HONEYHIVE_API_KEY") is not None
