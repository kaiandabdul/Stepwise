# E2B V2 Template Build - Quick Reference

## ⚠️ IMPORTANT: DO NOT Use Old CLI Command

**WRONG (deprecated v1):**
```bash
e2b template build --name stepwise-debugger  # ❌ DEPRECATED - Will fail!
```

**CORRECT (v2 SDK):**
```bash
python build_dev.py  # ✅ Use this instead!
```

---

## Prerequisites Checklist

Before building the template, ensure:

- [ ] Python 3.13 installed and active
  ```bash
  python --version  # Should show 3.13.x
  ```

- [ ] Virtual environment created and activated
  ```bash
  python -m venv venv
  source venv/bin/activate
  ```

- [ ] Python dependencies installed
  ```bash
  pip install -r requirements.txt
  ```

- [ ] E2B API key in .env file
  ```bash
  grep E2B_API_KEY .env  # Should show your key
  ```

---

## Step-by-Step Build Process

### 1. Setup Environment (if not done)

```bash
# Navigate to project root
cd /Users/codewithabdul/LockeIn/Stepwise

# Verify Python 3.13 is active
python --version  # Should show: Python 3.13.0

# Create and activate venv
python -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Build E2B Template

```bash
# Navigate to template directory
cd e2b-template

# Build development template (2 CPU, 4GB RAM)
python build_dev.py

# OR build production template (4 CPU, 8GB RAM)
python build_prod.py
```

### 3. Expected Output

```
🏗️  Building E2B template for Stepwise (Development)...
============================================================
📦 Including license file `LICENSE`
🍹 Building template...
[Build logs...]
============================================================
✅ Template built successfully!
   Template ID: tmpl_xxxxxxxxxxxxx
   Alias: stepwise-dev

💡 Add this to your .env file:
   E2B_TEMPLATE_ID=tmpl_xxxxxxxxxxxxx
============================================================
```

### 4. Save Template ID

Copy the template ID from output and add to `.env`:
```bash
echo "E2B_TEMPLATE_ID=tmpl_xxxxxxxxxxxxx" >> ../.env
```

---

## Common Errors & Solutions

### Error: "No module named 'dotenv'"
**Cause:** Python dependencies not installed
**Fix:**
```bash
source venv/bin/activate  # Activate venv first!
pip install -r requirements.txt
```

### Error: "No ./e2b.Dockerfile found"
**Cause:** Using old v1 CLI command
**Fix:** Use `python build_dev.py` instead of `e2b template build`

### Error: "pydantic-core build failed"
**Cause:** Python 3.14 is too new
**Fix:** Use Python 3.13 (already configured in `.python-version`)

---

## Quick Command Reference

```bash
# Check Python version
python --version

# Activate venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Build template (development)
cd e2b-template && python build_dev.py

# Build template (production)
cd e2b-template && python build_prod.py

# Verify E2B authentication
e2b auth whoami
```

---

## Files in e2b-template/

- `template.py` - SDK-based template definition (replaces old Dockerfile)
- `build_dev.py` - Development build script (2 CPU, 4GB RAM)
- `build_prod.py` - Production build script (4 CPU, 8GB RAM)
- `README.md` - Detailed documentation
- `.e2bignore` - Files to exclude from template

**Old files (deleted):**
- ~~`e2b.Dockerfile`~~ - Removed (v1 format)
- ~~`Dockerfile`~~ - Removed (v1 format)
- ~~`e2b.toml`~~ - Removed (v1 config)

---

## Next Steps After Template Build

1. Copy template ID to `.env`
2. Test sandbox creation in agent code
3. Proceed to Phase 2: Build MCP servers
