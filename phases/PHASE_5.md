# Phase 5: Frontend Development (Gradio Interface)

**Duration**: 6-8 hours
**Priority**: Critical
**Risk Level**: Low
**Prerequisites**: Phase 4 complete (Agent API functional)

## Overview

Build user-friendly Gradio interface for interacting with the agent via text and voice input.

## Objectives

1. Create Gradio app with text and audio input
2. Display workflow execution steps in real-time
3. Show results and logs
4. Handle errors gracefully

## Key Deliverables

### Gradio App (`frontend/app.py`)

```python
import gradio as gr
import requests
import json
from datetime import datetime

AGENT_URL = "http://localhost:3000"

def process_text(text, session_id):
    """Process text query"""
    try:
        response = requests.post(
            f"{AGENT_URL}/query",
            json={"input": text, "session_id": session_id},
            timeout=120
        )
        result = response.json()

        # Format workflow steps
        workflow_md = format_workflow(result.get("workflow", {}))
        response_text = result.get("response", "No response")

        return response_text, workflow_md
    except Exception as e:
        return f"Error: {str(e)}", ""

def process_audio(audio_path, session_id):
    """Process audio input"""
    try:
        with open(audio_path, 'rb') as f:
            audio_data = f.read()

        response = requests.post(
            f"{AGENT_URL}/query/audio",
            json={"audio": audio_data.decode('latin1'), "session_id": session_id},
            timeout=120
        )
        result = response.json()

        workflow_md = format_workflow(result.get("workflow", {}))
        response_text = result.get("response", "No response")

        return response_text, workflow_md
    except Exception as e:
        return f"Error: {str(e)}", ""

def format_workflow(workflow):
    """Format workflow steps as markdown"""
    if not workflow or 'steps' not in workflow:
        return "No workflow data"

    md = "## Workflow Execution\n\n"
    for i, step in enumerate(workflow['steps'], 1):
        status = "✅" if step.get('status') == 'completed' else "❌"
        md += f"{i}. {status} **{step['tool']}**\n"
        md += f"   - Parameters: `{json.dumps(step['parameters'])}`\n"
        if step.get('result'):
            md += f"   - Result: {json.dumps(step['result'])[:100]}...\n"
        md += "\n"
    return md

# Create Gradio interface
with gr.Blocks(title="Stepwise - Live API Debugger") as demo:
    gr.Markdown("# Stepwise - Live API Debugger Agent")
    gr.Markdown("Debug APIs using voice or text commands powered by MCP, E2B, and Docker")

    session_id = gr.State(value=f"session-{datetime.now().timestamp()}")

    with gr.Tab("💬 Text Input"):
        text_input = gr.Textbox(
            label="Describe your API debugging task",
            placeholder="Example: Test the JSONPlaceholder API by getting user 1 and trace it in HoneyHive",
            lines=3
        )
        text_btn = gr.Button("Submit", variant="primary")
        text_output = gr.Textbox(label="Agent Response", lines=10)
        text_workflow = gr.Markdown(label="Workflow Steps")

        text_btn.click(
            fn=process_text,
            inputs=[text_input, session_id],
            outputs=[text_output, text_workflow]
        )

    with gr.Tab("🎤 Voice Input"):
        audio_input = gr.Audio(
            sources=["microphone", "upload"],
            type="filepath",
            label="Record or upload audio command"
        )
        audio_btn = gr.Button("Submit Audio", variant="primary")
        audio_output = gr.Textbox(label="Agent Response", lines=10)
        audio_workflow = gr.Markdown(label="Workflow Steps")

        audio_btn.click(
            fn=process_audio,
            inputs=[audio_input, session_id],
            outputs=[audio_output, audio_workflow]
        )

    with gr.Tab("📊 Session Info"):
        gr.Markdown(f"**Session ID:** {session_id.value}")
        gr.Markdown("Use the same session to maintain context across requests")

# Launch
if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False  # Set True for public link
    )
```

### Dependencies (`frontend/requirements.txt`)

```
gradio>=4.0.0
requests>=2.31.0
python-dotenv>=1.0.0
```

## Testing

```bash
cd frontend
pip install -r requirements.txt
python app.py

# Visit http://localhost:7860
# Test text: "Test GET https://jsonplaceholder.typicode.com/users/1"
# Test audio: Record "Get user one from JSON placeholder API"
```

## Success Criteria

- [ ] Gradio interface loads at http://localhost:7860
- [ ] Can submit text query and see results
- [ ] Can record/upload audio and see transcription
- [ ] Workflow steps display with status indicators
- [ ] Error messages shown clearly
- [ ] Session ID persists across tabs

## Next Steps

**[Phase 6: Security & Robustness](./PHASE_6.md)**
