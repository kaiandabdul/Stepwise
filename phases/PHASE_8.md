# Phase 8: Deployment & Demo Prep

**Duration**: 4-6 hours
**Priority**: High
**Risk Level**: Low
**Prerequisites**: Phase 7 complete (all tests passing)

## Overview

Deploy to production environment and prepare for hackathon demo. This phase ensures you have a reliable, demo-ready application with contingency plans.

## Objectives

1. Deploy to production environment
2. Final end-to-end testing in production
3. Prepare demo materials (slides, video)
4. Create fallback plan for live demo
5. Practice demo presentation

## Deployment Options

### Option 1: Cloud VM (Recommended for Stability)

**Provision VM** (AWS EC2 / GCP Compute / DigitalOcean):
- Ubuntu 22.04 LTS
- 4 vCPU, 8GB RAM
- 50GB SSD storage

**Setup**:

```bash
# SSH into VM
ssh ubuntu@<your-vm-ip>

# Install dependencies
sudo apt update
sudo apt install -y docker.io docker-compose git nodejs npm python3 python3-pip

# Clone repository
git clone <your-repo-url>
cd Stepwise

# Configure environment
cp .env.example .env
nano .env  # Add production API keys

# Build and start
docker-compose -f docker-compose.prod.yml up -d

# Start agent
cd agent
npm install
npm start &

# Start frontend
cd ../frontend
pip3 install -r requirements.txt
python3 app.py --share &
```

**Gradio will output**:
```
Running on public URL: https://xxxxx.gradio.live
```

Share this URL for demo!

### Option 2: Gradio Public Link (Simplest)

```python
# frontend/app.py
demo.launch(
    server_name="0.0.0.0",
    server_port=7860,
    share=True  # Creates public link automatically
)
```

Run locally and share the generated link.

### Option 3: Local + Ngrok

```bash
# Start locally
docker-compose up -d
cd agent && npm start &
cd frontend && python app.py &

# Expose with ngrok
ngrok http 7860

# Share ngrok URL: https://xxxx.ngrok.io
```

## Pre-Demo Checklist

### 24 Hours Before Demo

- [ ] All API keys valid and have quota
- [ ] E2B credits sufficient (check: `e2b sandbox quota`)
- [ ] Application deployed and accessible via public URL
- [ ] All services healthy (`curl <url>/health`)
- [ ] Test full workflow 3x in production
- [ ] Backup API keys prepared
- [ ] Backup video recorded
- [ ] Demo script printed/available
- [ ] Laptop charged, backup laptop ready
- [ ] Alternative network connection (mobile hotspot)

### 1 Hour Before Demo

- [ ] Clear browser cache
- [ ] Close unnecessary applications
- [ ] Test internet connection
- [ ] Open all necessary tabs
- [ ] Have backup video ready to play
- [ ] Microphone/audio tested
- [ ] Screen resolution optimized for projector

## Demo Script (3 Minutes)

### Slide 1: Problem (20 seconds)

**Script**:
> "Debugging APIs is tedious. You have to transcribe voice commands, parse them, make API calls, trace execution, and check security. What if an AI agent could do this end-to-end?"

**Visual**: Screenshot of traditional API testing (Postman, manual logs)

### Slide 2: Solution (20 seconds)

**Script**:
> "Meet Stepwise - a live API debugger agent using Model Context Protocol, E2B sandboxes, and Docker. It integrates three sponsor tools: Gladia for speech-to-text, HoneyHive for observability, and Horizon3 for security."

**Visual**: Architecture diagram showing User → Agent → E2B → MCP Servers

### Live Demo (120 seconds)

**Demo Flow**:

1. **Show Interface** (10s)
   - Navigate to Gradio URL
   - "Here's our Gradio interface with text and voice input."

2. **Voice Command** (30s)
   - Click microphone icon
   - Record: "Test the JSONPlaceholder API by getting user data for ID 1, then create a trace in HoneyHive"
   - Click Submit
   - Show transcription appearing: "User said: Test the JSONPlaceholder API..."

3. **Workflow Execution** (40s)
   - Point to workflow steps appearing:
     - ✅ Transcribing audio with Gladia
     - ✅ Planning workflow with GPT-4
     - ✅ Calling API: GET https://jsonplaceholder.typicode.com/users/1
     - ✅ Creating HoneyHive trace
     - ✅ Logging results
   - Show API response with user data

4. **Observability** (20s)
   - Switch to HoneyHive dashboard tab (pre-opened)
   - Show the trace with all steps and latencies
   - "Every step is traced for debugging"

5. **Security** (20s)
   - Back to Stepwise
   - Type: "Run security scan on jsonplaceholder.typicode.com"
   - Show Horizon3 scan results
   - "Automated security checks"

### Slide 3: Wrap-up (20 seconds)

**Script**:
> "Stepwise demonstrates the power of MCP for standardizing AI tool integration, E2B for secure isolation, and Docker for reproducibility. Use cases include API testing, security auditing, and workflow automation. Thank you!"

**Visual**: Summary slide with GitHub link

### Backup Demo (If Live Fails)

1. Play pre-recorded video (2 minutes)
2. Walk through code architecture (1 minute)
3. Show HoneyHive traces from previous runs
4. Explain what would have happened

## Demo Materials Checklist

### Slides (4 slides)

- [ ] Slide 1: Problem statement with visual
- [ ] Slide 2: Architecture diagram
- [ ] Slide 3: Live demo (just title, actual demo)
- [ ] Slide 4: Use cases and next steps

### Video Backup

Record successful demo showing:
- [ ] Voice input being transcribed
- [ ] Workflow executing with all steps
- [ ] API results displayed
- [ ] HoneyHive trace visible
- [ ] Horizon3 scan results

Save as: `stepwise-demo-backup.mp4`

### Test Data

Prepare reliable test endpoints:
- [ ] https://jsonplaceholder.typicode.com/users/1 (GET)
- [ ] https://jsonplaceholder.typicode.com/posts (GET)
- [ ] https://jsonplaceholder.typicode.com/posts (POST with body)

Audio command prepared:
- [ ] Record: "Test the JSONPlaceholder API by getting user 1"
- [ ] Save as: `demo-command.mp3`

## Practice Runs

### Rehearsal Checklist

- [ ] Run demo 3+ times successfully
- [ ] Time each section (should fit in 3 minutes)
- [ ] Practice transitions between slides and demo
- [ ] Test audio levels if presenting virtually
- [ ] Practice with team members watching
- [ ] Get feedback and iterate

### Timing Breakdown

| Section | Time | Notes |
|---------|------|-------|
| Problem | 20s | Clear and concise |
| Solution | 20s | Architecture overview |
| Voice input | 30s | Record and transcribe |
| Workflow | 40s | Show all steps |
| Observability | 20s | HoneyHive trace |
| Security | 20s | Horizon3 scan |
| Wrap-up | 20s | Summary and thanks |
| **Total** | **2:50** | **10s buffer** |

## Production Health Monitoring

### Create Monitoring Script

**`scripts/health-check.sh`**:

```bash
#!/bin/bash

echo "=== Stepwise Health Check ==="
echo ""

# Check agent
echo "Agent:"
curl -f http://localhost:3000/health && echo " ✅" || echo " ❌"

# Check MCP servers
echo "Gladia MCP:"
curl -f http://localhost:8000/health && echo " ✅" || echo " ❌"

echo "HoneyHive MCP:"
curl -f http://localhost:8001/health && echo " ✅" || echo " ❌"

echo "Horizon3 MCP:"
curl -f http://localhost:8002/health && echo " ✅" || echo " ❌"

echo "Custom API MCP:"
curl -f http://localhost:8003/health && echo " ✅" || echo " ❌"

# Check E2B quota
echo ""
echo "E2B Quota:"
e2b sandbox quota

echo ""
echo "=== All Systems Check Complete ==="
```

Run before demo:
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

## Troubleshooting During Demo

### Issue: Gradio Link Expired

**Solution**: Restart frontend with `share=True`, get new link

### Issue: E2B Out of Credits

**Solution**: Switch to local Docker mode (`USE_E2B=false`), restart agent

### Issue: Voice Input Not Working

**Solution**: Use text input tab, demonstrate same workflow

### Issue: API Timeout

**Solution**: Use backup test data, or show pre-recorded video

### Issue: Internet Disconnects

**Solution**:
1. Switch to mobile hotspot
2. Or play backup video
3. Or show local docker-compose running

## Post-Demo

### Cleanup

```bash
# Stop all services
docker-compose down

# Kill E2B sandboxes
e2b sandbox list
e2b sandbox kill <sandbox-id>

# Save logs for review
docker-compose logs > demo-logs.txt
```

### Gather Feedback

- Note questions from judges
- Document any issues encountered
- Collect improvement ideas
- Save all demo materials

## Success Criteria

- [ ] Application deployed and publicly accessible
- [ ] Health checks passing
- [ ] Can complete full demo in <3 minutes
- [ ] Backup video demonstrates all features
- [ ] Demo rehearsed 3+ times
- [ ] All materials prepared (slides, video, test data)
- [ ] Contingency plans tested

---

## Hackathon Submission Checklist

- [ ] GitHub repository public
- [ ] README.md complete with demo video link
- [ ] All code committed and pushed
- [ ] Documentation in `/docs` folder
- [ ] Demo video uploaded (YouTube/Loom)
- [ ] Slides uploaded
- [ ] Submission form completed
- [ ] All sponsor tools demonstrated (Gladia, HoneyHive, Horizon3)
- [ ] E2B + Docker integration shown
- [ ] MCP protocol used throughout

---

**Phase 8 Complete!** You're ready to demo Stepwise! 🚀🎉

**Final Tips**:
1. Stay calm, you've prepared thoroughly
2. If something breaks, pivot to backup plan smoothly
3. Explain the architecture even if demo fails
4. Judges care about the idea and implementation, not just perfect execution
5. Have fun and be proud of what you built!

**Good luck at the hackathon!**
