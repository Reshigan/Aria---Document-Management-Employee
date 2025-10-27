# Ollama Setup Guide for Aria AI Bots

Aria now uses **local Ollama** for AI-powered bots - completely free, private, and fast! 🚀

## Why Ollama?

✅ **Free**: No API costs  
✅ **Private**: Your data never leaves your server  
✅ **Fast**: Local inference, no network latency  
✅ **No Rate Limits**: Run as many queries as you want  
✅ **South African Ready**: Perfect for data sovereignty compliance  

## Installation

### Ubuntu/Debian (Recommended for Production)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
sudo systemctl start ollama
sudo systemctl enable ollama  # Auto-start on boot

# Verify installation
ollama --version
```

### macOS

```bash
# Download from https://ollama.com/download
# Or use Homebrew
brew install ollama

# Start Ollama
ollama serve
```

### Windows

1. Download installer from https://ollama.com/download
2. Run installer
3. Ollama will start automatically

## Download Recommended Models

Aria works best with these models:

### Option 1: Llama 3.2 (Recommended - Fast & Accurate)
```bash
ollama pull llama3.2
```

### Option 2: Mistral (Alternative - Great for South African English)
```bash
ollama pull mistral
```

### Option 3: Mixtral (Most Powerful - Needs more RAM)
```bash
ollama pull mixtral
```

### Option 4: Phi-3 (Lightweight - Low memory usage)
```bash
ollama pull phi3
```

## Configuration

Add these to your `.env` file:

```bash
# AI Provider (ollama or openai)
AI_PROVIDER=ollama

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Optional: OpenAI Fallback (if you want both)
# OPENAI_API_KEY=sk-your-key-here
# OPENAI_MODEL=gpt-4-turbo-preview
```

## Testing Ollama

```bash
# Test Ollama is working
curl http://localhost:11434/api/tags

# Test a query
ollama run llama3.2 "What is BBBEE compliance in South Africa?"
```

## Production Deployment (Ubuntu Server)

### 1. Install on Server

```bash
ssh ubuntu@3.8.139.178

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start service
sudo systemctl start ollama
sudo systemctl enable ollama
```

### 2. Download Model

```bash
# Download your chosen model
ollama pull llama3.2

# Verify it's ready
ollama list
```

### 3. Configure Aria

```bash
cd /var/www/aria
nano .env

# Add these lines
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### 4. Restart Aria

```bash
# Find Aria process
ps aux | grep uvicorn

# Kill old process
kill -9 <PID>

# Start new process with AI enabled
cd /var/www/aria/backend
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > /var/log/aria.log 2>&1 &
```

## Model Comparison

| Model | RAM Required | Speed | Quality | Best For |
|-------|--------------|-------|---------|----------|
| **llama3.2** | 8GB | Fast | Excellent | General use (Recommended) |
| **mistral** | 8GB | Very Fast | Great | Quick responses |
| **mixtral** | 16GB+ | Medium | Best | Complex analysis |
| **phi3** | 4GB | Very Fast | Good | Low-resource servers |

## Performance Tuning

### Increase Context Window

```bash
# For larger documents
export OLLAMA_MAX_LOADED_MODELS=2
export OLLAMA_NUM_PARALLEL=4
```

### GPU Acceleration (if available)

Ollama automatically uses GPU if available. Check with:

```bash
nvidia-smi  # For NVIDIA GPUs
```

## Troubleshooting

### Issue: "Could not connect to Ollama"

```bash
# Check if Ollama is running
sudo systemctl status ollama

# Start Ollama
sudo systemctl start ollama
```

### Issue: "Model not found"

```bash
# List installed models
ollama list

# Pull missing model
ollama pull llama3.2
```

### Issue: "Out of memory"

Switch to a smaller model:

```bash
# Use phi3 instead
ollama pull phi3

# Update .env
OLLAMA_MODEL=phi3
```

## Using OpenAI Instead

If you prefer OpenAI (requires API key and costs money):

```bash
# .env configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4-turbo-preview
```

## Next Steps

Once Ollama is running:

1. ✅ Start Aria backend
2. ✅ Test bots in the UI
3. ✅ Ask questions like:
   - "Show me overdue invoices"
   - "Calculate our BBBEE scorecard"
   - "What's our payroll for this month?"
   - "Which products need reordering?"

## Support

- Ollama Docs: https://ollama.com/docs
- Aria Bot Docs: See `TECHNICAL_REALITY_CHECK.md`
- Issues: Create an issue in the repo

---

**Made with 🇿🇦 for South African businesses**
