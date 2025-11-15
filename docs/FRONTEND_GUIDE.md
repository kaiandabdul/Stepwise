# FRONTEND_GUIDE.md

## Gradio/Streamlit Interface Implementation

### Table of Contents
1. [Frontend Framework Selection](#frontend-framework-selection)
2. [Gradio Implementation](#gradio-implementation)
3. [Streamlit Implementation (Alternative)](#streamlit-implementation-alternative)
4. [Backend API Endpoints](#backend-api-endpoints)
5. [UI/UX Best Practices](#uiux-best-practices)
6. [Workflow Visualization](#workflow-visualization)
7. [Logs and Documentation Display](#logs-and-documentation-display)
8. [Deployment](#deployment)
9. [Testing Frontend](#testing-frontend)
10. [Accessibility and Polish](#accessibility-and-polish)

---

## 1. Frontend Framework Selection

### 1.1 Gradio vs Streamlit Comparison

| Feature | Gradio | Streamlit |
|---------|--------|-----------|
| **Audio Input** | ✅ Native `gr.Audio()` | ⚠️ Requires custom component |
| **Learning Curve** | ✅ Very simple | ✅ Simple |
| **Customization** | ⚠️ Limited CSS/HTML | ✅ More flexible |
| **Real-time Updates** | ✅ Good with `.stream()` | ✅ Good with `st.experimental_rerun()` |
| **Deployment** | ✅ Easy (`share=True`) | ✅ Easy (Streamlit Cloud) |
| **Mobile Support** | ✅ Responsive | ✅ Responsive |
| **Tabs/Layout** | ✅ `gr.Tab()`, `gr.Row()` | ✅ `st.tabs()`, `st.columns()` |

**Recommendation**: **Gradio** for this project due to native audio input support (critical for speech-to-text feature).

---

## 2. Gradio Implementation

### 2.1 Installation

**requirements.txt**:
```
gradio>=4.0.0
requests>=2.31.0
python-dotenv>=1.0.0
```

```bash
pip install -r requirements.txt
```

### 2.2 Basic Interface Structure

**frontend/app.py**:
```python
import gradio as gr
import requests
import os
from dotenv import load_dotenv

load_dotenv()

AGENT_URL = os.getenv('AGENT_URL', 'http://localhost:3000')

def process_text_query(text, session_id):
    """Send text query to agent backend"""
    try:
        response = requests.post(
            f'{AGENT_URL}/query',
            json={'input': text, 'session_id': session_id, 'mode': 'text'},
            timeout=120
        )
        response.raise_for_status()
        result = response.json()

        return (
            result.get('response', 'No response'),
            format_workflow_steps(result.get('workflow', {})),
            result.get('session_id', session_id)
        )

    except requests.exceptions.Timeout:
        return "⚠️ Request timed out. Please try again.", "", session_id
    except requests.exceptions.RequestException as e:
        return f"❌ Error: {str(e)}", "", session_id

def process_audio_query(audio, session_id):
    """Send audio file to agent backend (will use Gladia for transcription)"""
    if audio is None:
        return "⚠️ No audio provided", "", session_id

    try:
        # audio is a filepath when using gr.Audio
        with open(audio, 'rb') as audio_file:
            files = {'audio': audio_file}
            data = {'session_id': session_id}

            response = requests.post(
                f'{AGENT_URL}/query/audio',
                files=files,
                data=data,
                timeout=120
            )

        response.raise_for_status()
        result = response.json()

        return (
            result.get('response', 'No response'),
            format_workflow_steps(result.get('workflow', {})),
            result.get('session_id', session_id)
        )

    except Exception as e:
        return f"❌ Error processing audio: {str(e)}", "", session_id

def format_workflow_steps(workflow):
    """Format workflow steps as markdown"""
    if not workflow or 'steps' not in workflow:
        return "No workflow information available"

    steps = workflow['steps']
    md = "## Workflow Execution\n\n"

    for i, step in enumerate(steps, 1):
        status = step.get('status', 'unknown')
        status_emoji = {
            'completed': '✅',
            'failed': '❌',
            'running': '🔄',
            'pending': '⏳',
            'skipped': '⏭️'
        }.get(status, '❓')

        md += f"{i}. {status_emoji} **{step.get('name', 'Unknown')}** ({step.get('tool', 'Unknown')})\n"

        if step.get('error'):
            md += f"   - ❌ Error: {step['error']}\n"
        elif step.get('result'):
            md += f"   - ✅ Duration: {step.get('duration_ms', 'N/A')}ms\n"

        md += "\n"

    return md

def create_interface():
    """Create Gradio interface"""

    with gr.Blocks(
        title="Stepwise - Live API Debugger Agent",
        theme=gr.themes.Soft()
    ) as demo:
        gr.Markdown("""
        # 🚀 Stepwise - Live API Debugger Agent

        Debug APIs using natural language or voice commands. Powered by MCP, E2B, and Docker.
        """)

        # Session state
        session_id = gr.State(value=None)

        with gr.Tabs():
            # Text Input Tab
            with gr.Tab("💬 Text Input"):
                with gr.Row():
                    with gr.Column(scale=2):
                        text_input = gr.Textbox(
                            label="Describe your API debugging task",
                            placeholder="Example: Test POST endpoint at https://api.example.com/users",
                            lines=3
                        )
                        text_button = gr.Button("Submit", variant="primary")

                with gr.Row():
                    text_output = gr.Textbox(
                        label="Agent Response",
                        lines=10,
                        interactive=False
                    )

                with gr.Row():
                    workflow_output_text = gr.Markdown(
                        label="Workflow Steps",
                        value="Workflow steps will appear here..."
                    )

            # Voice Input Tab
            with gr.Tab("🎤 Voice Input"):
                with gr.Row():
                    with gr.Column(scale=2):
                        audio_input = gr.Audio(
                            label="Record your debugging request",
                            sources=["microphone", "upload"],
                            type="filepath"
                        )
                        audio_button = gr.Button("Submit Audio", variant="primary")

                with gr.Row():
                    audio_output = gr.Textbox(
                        label="Agent Response",
                        lines=10,
                        interactive=False
                    )

                with gr.Row():
                    workflow_output_audio = gr.Markdown(
                        label="Workflow Steps",
                        value="Workflow steps will appear here..."
                    )

            # Logs Tab
            with gr.Tab("📊 Session Logs"):
                gr.Markdown("View session history and logs")

                session_display = gr.Textbox(
                    label="Current Session ID",
                    interactive=False
                )

                logs_output = gr.Textbox(
                    label="Session Logs",
                    lines=20,
                    interactive=False
                )

                refresh_logs_btn = gr.Button("Refresh Logs")

        # Event handlers
        text_button.click(
            fn=process_text_query,
            inputs=[text_input, session_id],
            outputs=[text_output, workflow_output_text, session_id]
        )

        audio_button.click(
            fn=process_audio_query,
            inputs=[audio_input, session_id],
            outputs=[audio_output, workflow_output_audio, session_id]
        )

        # Update session display when session_id changes
        session_id.change(
            fn=lambda sid: sid if sid else "No active session",
            inputs=[session_id],
            outputs=[session_display]
        )

        # Refresh logs button
        def get_logs(sid):
            if not sid:
                return "No active session"

            try:
                response = requests.get(f'{AGENT_URL}/logs/{sid}', timeout=10)
                response.raise_for_status()
                logs = response.json().get('logs', [])
                return "\n".join(logs)
            except Exception as e:
                return f"Error fetching logs: {str(e)}"

        refresh_logs_btn.click(
            fn=get_logs,
            inputs=[session_id],
            outputs=[logs_output]
        )

    return demo

if __name__ == "__main__":
    demo = create_interface()
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False  # Set to True for public Gradio link
    )
```

### 2.3 Advanced Features

#### 2.3.1 Real-time Streaming

```python
def stream_workflow_execution(text, session_id):
    """Stream workflow steps in real-time"""

    # Make streaming request
    response = requests.post(
        f'{AGENT_URL}/query/stream',
        json={'input': text, 'session_id': session_id},
        stream=True
    )

    workflow_md = "## Workflow Execution\n\n"

    for line in response.iter_lines():
        if line:
            data = json.loads(line.decode('utf-8'))

            if data['type'] == 'step_start':
                workflow_md += f"🔄 {data['step_name']}...\n"
                yield workflow_md

            elif data['type'] == 'step_complete':
                workflow_md = workflow_md.replace(
                    f"🔄 {data['step_name']}...",
                    f"✅ {data['step_name']} ({data['duration_ms']}ms)"
                )
                yield workflow_md

            elif data['type'] == 'result':
                yield workflow_md

# Use with gr.Textbox output
text_button.click(
    fn=stream_workflow_execution,
    inputs=[text_input, session_id],
    outputs=[workflow_output_text],
    stream=True  # Enable streaming
)
```

#### 2.3.2 File Upload for API Specs

```python
with gr.Tab("📄 Upload API Spec"):
    spec_file = gr.File(
        label="Upload OpenAPI/Swagger Spec",
        file_types=[".json", ".yaml", ".yml"]
    )

    parse_btn = gr.Button("Parse Spec")

    spec_output = gr.Markdown()

    def parse_openapi_spec(file):
        if file is None:
            return "No file uploaded"

        try:
            with open(file.name, 'r') as f:
                spec_content = f.read()

            response = requests.post(
                f'{AGENT_URL}/parse-spec',
                json={'spec': spec_content},
                timeout=30
            )

            result = response.json()

            md = f"## API Spec: {result.get('info', {}).get('title', 'Unknown')}\n\n"
            md += f"**Version**: {result.get('info', {}).get('version', 'N/A')}\n\n"
            md += f"**Endpoints**: {result.get('total_endpoints', 0)}\n\n"

            md += "### Available Endpoints\n"
            for endpoint in result.get('endpoints', [])[:10]:
                md += f"- `{endpoint['method']}` {endpoint['path']}\n"

            return md

        except Exception as e:
            return f"Error parsing spec: {str(e)}"

    parse_btn.click(
        fn=parse_openapi_spec,
        inputs=[spec_file],
        outputs=[spec_output]
    )
```

#### 2.3.3 Session Management

```python
def create_new_session():
    """Create a new session"""
    import uuid
    new_session_id = str(uuid.uuid4())
    return new_session_id, f"✅ New session created: {new_session_id}"

def clear_session():
    """Clear current session"""
    return None, "✅ Session cleared"

# Add buttons in interface
with gr.Row():
    new_session_btn = gr.Button("New Session")
    clear_session_btn = gr.Button("Clear Session")
    status_msg = gr.Textbox(label="Status", interactive=False)

new_session_btn.click(
    fn=create_new_session,
    inputs=[],
    outputs=[session_id, status_msg]
)

clear_session_btn.click(
    fn=clear_session,
    inputs=[],
    outputs=[session_id, status_msg]
)
```

### 2.4 Custom Styling

```python
# Custom CSS
custom_css = """
#main-container {
    max-width: 1200px;
    margin: 0 auto;
}

.primary-btn {
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    border: none;
}

.workflow-step {
    padding: 10px;
    margin: 5px 0;
    border-left: 3px solid #667eea;
    background: #f7f7f7;
}
"""

with gr.Blocks(
    title="Stepwise Agent",
    theme=gr.themes.Soft(),
    css=custom_css
) as demo:
    # ... interface code
```

---

## 3. Streamlit Implementation (Alternative)

### 3.1 Basic Streamlit App

**frontend/app.py**:
```python
import streamlit as st
import requests
import uuid

st.set_page_config(
    page_title="Stepwise - API Debugger",
    page_icon="🚀",
    layout="wide"
)

# Initialize session state
if 'session_id' not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())

if 'conversation_history' not in st.session_state:
    st.session_state.conversation_history = []

# Title
st.title("🚀 Stepwise - Live API Debugger Agent")
st.markdown("Debug APIs using natural language. Powered by MCP, E2B, and Docker.")

# Sidebar
with st.sidebar:
    st.header("Session Info")
    st.text(f"Session ID: {st.session_state.session_id[:8]}...")

    if st.button("New Session"):
        st.session_state.session_id = str(uuid.uuid4())
        st.session_state.conversation_history = []
        st.success("New session created!")

    st.divider()

    st.header("Settings")
    agent_url = st.text_input(
        "Agent URL",
        value="http://localhost:3000",
        key="agent_url"
    )

# Main content
tab1, tab2, tab3 = st.tabs(["💬 Text Input", "🎤 Voice Input", "📊 Logs"])

with tab1:
    st.header("Text Input")

    text_input = st.text_area(
        "Describe your API debugging task",
        placeholder="Example: Test POST endpoint at https://api.example.com/users",
        height=100
    )

    if st.button("Submit", type="primary"):
        if text_input:
            with st.spinner("Processing..."):
                try:
                    response = requests.post(
                        f"{agent_url}/query",
                        json={
                            'input': text_input,
                            'session_id': st.session_state.session_id
                        },
                        timeout=120
                    )
                    response.raise_for_status()
                    result = response.json()

                    # Add to conversation history
                    st.session_state.conversation_history.append({
                        'input': text_input,
                        'output': result.get('response', ''),
                        'workflow': result.get('workflow', {})
                    })

                    st.success("✅ Query processed!")
                    st.markdown("### Response")
                    st.write(result.get('response', 'No response'))

                    # Display workflow
                    if result.get('workflow'):
                        st.markdown("### Workflow Steps")
                        for i, step in enumerate(result['workflow'].get('steps', []), 1):
                            status = step.get('status', 'unknown')
                            emoji = {
                                'completed': '✅',
                                'failed': '❌',
                                'running': '🔄'
                            }.get(status, '❓')

                            with st.expander(f"{emoji} Step {i}: {step.get('name')}"):
                                st.json(step)

                except Exception as e:
                    st.error(f"❌ Error: {str(e)}")
        else:
            st.warning("⚠️ Please enter a query")

with tab2:
    st.header("Voice Input")
    st.info("ℹ️ Audio input requires additional setup with Streamlit")

    # Note: Streamlit doesn't have native audio recording
    # Would need custom component or file upload

    uploaded_audio = st.file_uploader(
        "Upload audio file",
        type=['mp3', 'wav', 'ogg', 'm4a']
    )

    if uploaded_audio and st.button("Process Audio"):
        with st.spinner("Transcribing and processing..."):
            try:
                files = {'audio': uploaded_audio}
                data = {'session_id': st.session_state.session_id}

                response = requests.post(
                    f"{agent_url}/query/audio",
                    files=files,
                    data=data,
                    timeout=120
                )
                response.raise_for_status()
                result = response.json()

                st.success("✅ Audio processed!")
                st.markdown("### Response")
                st.write(result.get('response', ''))

            except Exception as e:
                st.error(f"❌ Error: {str(e)}")

with tab3:
    st.header("Session Logs")

    if st.button("Refresh Logs"):
        try:
            response = requests.get(
                f"{agent_url}/logs/{st.session_state.session_id}",
                timeout=10
            )
            response.raise_for_status()
            logs = response.json().get('logs', [])

            st.text_area(
                "Logs",
                value="\n".join(logs),
                height=400
            )

        except Exception as e:
            st.error(f"Error fetching logs: {str(e)}")

# Conversation history
if st.session_state.conversation_history:
    st.divider()
    st.header("Conversation History")

    for i, conv in enumerate(reversed(st.session_state.conversation_history)):
        with st.expander(f"Query {len(st.session_state.conversation_history) - i}"):
            st.markdown("**Input:**")
            st.write(conv['input'])
            st.markdown("**Output:**")
            st.write(conv['output'])
```

---

## 4. Backend API Endpoints

### 4.1 FastAPI Backend Structure

**agent/src/api/routes.js** (or **routes.py** for Python):

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import uuid

app = FastAPI()

class QueryRequest(BaseModel):
    input: str
    session_id: str = None
    mode: str = "text"

@app.post("/query")
async def query(request: QueryRequest):
    """Handle text input queries"""

    # Generate session ID if not provided
    session_id = request.session_id or str(uuid.uuid4())

    try:
        # Process query with agent
        result = await agent.process(request.input, session_id)

        return {
            "success": True,
            "session_id": session_id,
            "response": result.response,
            "workflow": result.workflow.toJSON()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query/audio")
async def query_audio(
    audio: UploadFile = File(...),
    session_id: str = None
):
    """Handle audio input queries"""

    session_id = session_id or str(uuid.uuid4())

    try:
        # Save audio temporarily
        audio_path = f"/tmp/{uuid.uuid4()}.{audio.filename.split('.')[-1]}"
        with open(audio_path, 'wb') as f:
            f.write(await audio.read())

        # Process with agent (will use Gladia MCP for transcription)
        result = await agent.processAudio(audio_path, session_id)

        # Cleanup
        os.remove(audio_path)

        return {
            "success": True,
            "session_id": session_id,
            "transcription": result.transcription,
            "response": result.response,
            "workflow": result.workflow.toJSON()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/logs/{session_id}")
async def get_logs(session_id: str):
    """Get session logs"""

    try:
        logs = await session_manager.getLogs(session_id)
        return {"logs": logs}

    except Exception as e:
        raise HTTPException(status_code=404, detail="Session not found")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}
```

---

## 5. UI/UX Best Practices

### 5.1 Loading States

```python
# Show spinner during processing
with st.spinner("Processing your request..."):
    result = process_query(text)

# Gradio equivalent
text_button.click(
    fn=process_text_query,
    inputs=[text_input],
    outputs=[text_output],
    show_progress=True  # Shows progress bar
)
```

### 5.2 Error Messages

```python
def safe_process_query(text):
    """Process query with user-friendly error handling"""

    if not text.strip():
        return "⚠️ Please enter a query", ""

    if len(text) > 1000:
        return "⚠️ Query too long (max 1000 characters)", ""

    try:
        result = process_query(text)
        return f"✅ {result}", format_workflow(result.workflow)

    except requests.exceptions.Timeout:
        return "⏱️ Request timed out. Please try again.", ""

    except requests.exceptions.ConnectionError:
        return "🔌 Cannot connect to backend. Is the server running?", ""

    except Exception as e:
        return f"❌ Error: {str(e)}", ""
```

### 5.3 Input Validation

```python
def validate_api_url(url):
    """Validate API URL input"""

    if not url:
        return False, "URL cannot be empty"

    if not url.startswith(('http://', 'https://')):
        return False, "URL must start with http:// or https://"

    if 'localhost' in url.lower() or '127.0.0.1' in url:
        return False, "Cannot test localhost URLs for security reasons"

    return True, "Valid URL"
```

---

## 6. Workflow Visualization

### 6.1 Mermaid Diagram Integration

```python
def generate_workflow_mermaid(workflow):
    """Generate Mermaid diagram for workflow"""

    mermaid = "```mermaid\ngraph TD\n"

    for i, step in enumerate(workflow['steps']):
        node_id = f"step{i}"
        label = step['name'].replace(' ', '_')

        # Add node
        status = step.get('status', 'pending')
        color = {
            'completed': 'green',
            'failed': 'red',
            'running': 'yellow'
        }.get(status, 'gray')

        mermaid += f"    {node_id}[{label}]\n"
        mermaid += f"    style {node_id} fill:#{color}\n"

        # Add edges
        if i > 0:
            mermaid += f"    step{i-1} --> {node_id}\n"

    mermaid += "```"
    return mermaid

# Display in Gradio
gr.Markdown(generate_workflow_mermaid(workflow))
```

---

## 7. Logs and Documentation Display

```python
def format_session_logs(session_id):
    """Format session logs for display"""

    response = requests.get(f'{AGENT_URL}/logs/{session_id}')
    logs = response.json()['logs']

    formatted = "## Session Logs\n\n"

    for log in logs:
        timestamp = log.get('timestamp', '')
        level = log.get('level', 'INFO')
        message = log.get('message', '')

        emoji = {
            'INFO': 'ℹ️',
            'WARNING': '⚠️',
            'ERROR': '❌',
            'DEBUG': '🐛'
        }.get(level, '📝')

        formatted += f"{emoji} **[{timestamp}]** {message}\n\n"

    return formatted
```

---

## 8. Deployment

### 8.1 Gradio Cloud Deployment

```python
# Simply add share=True for public link
demo.launch(share=True)

# Or deploy to Hugging Face Spaces (free)
# Create app.py and requirements.txt, push to HF Space
```

### 8.2 Docker Deployment

See DOCKER_SETUP.md for complete frontend Dockerfile.

---

## 9. Testing Frontend

### 9.1 Manual Testing Checklist

- [ ] Text input submission works
- [ ] Audio recording works
- [ ] Audio file upload works
- [ ] Results display correctly
- [ ] Workflow visualization updates
- [ ] Error messages display properly
- [ ] Session management works
- [ ] Logs refresh correctly

### 9.2 Automated Testing (Gradio)

```python
from gradio.testing import Client

def test_text_query():
    client = Client("http://localhost:7860")

    result = client.predict(
        "Test API",
        api_name="/text_query"
    )

    assert result is not None
    assert len(result) > 0
```

---

## 10. Accessibility and Polish

- Clear labels and placeholders
- Keyboard shortcuts (Gradio supports Enter to submit)
- Mobile-responsive (both Gradio and Streamlit are responsive)
- Dark mode support (Gradio has built-in themes)
- Loading indicators for all async operations
- Helpful tooltips and info messages

---

## Conclusion

This frontend guide provides:

- ✅ Complete Gradio implementation
- ✅ Alternative Streamlit implementation
- ✅ Backend API endpoint specifications
- ✅ Real-time features and streaming
- ✅ Workflow visualization
- ✅ Error handling and validation
- ✅ Deployment instructions

**Next Steps**:
1. Implement Gradio interface with all features
2. Connect to agent backend API
3. Test all input methods (text, audio)
4. Deploy and share for demo

**Key Takeaways**:
- Gradio recommended for audio support
- Implement proper error handling
- Show loading states for better UX
- Visualize workflows for clarity
- Test thoroughly before demo
