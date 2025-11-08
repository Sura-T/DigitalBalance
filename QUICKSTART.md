# 🚀 Quick Start Guide - Digital Balance

Get up and running in under 10 minutes!

## Prerequisites Check

- [ ] Docker Desktop installed and running
- [ ] Files to upload: Sales Excel (.xlsx) and Bank PDF (.pdf)

## Step 1: Setup (2 minutes)

### Windows:
```cmd
cd C:\Users\Surafel\Videos\DigitalBalance
copy .env.example .env
notepad .env
```

### Linux/Mac:
```bash
cd /path/to/DigitalBalance
cp .env.example .env
nano .env
```

### Edit .env file:

**Option A - Use OpenAI (Recommended):**
```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo
```

**Option B - Use Stub (No LLM, for testing):**
```env
OPENAI_API_KEY=test
OPENAI_BASE_URL=http://stub
OPENAI_MODEL=stub
```

**Option C - Use Qwen (Free, requires local setup):**
```env
OPENAI_API_KEY=dummy
OPENAI_BASE_URL=http://host.docker.internal:8000/v1
OPENAI_MODEL=Qwen/Qwen2.5-7B-Instruct
```

## Step 2: Launch (3 minutes)

### Quick Start (Recommended):

**Windows:**
```cmd
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

### Manual Start:
```bash
docker-compose up --build -d
```

Wait for containers to start (~2-3 minutes for first build).

## Step 3: Verify (1 minute)

Open in browser:
- Frontend: http://localhost:3000
- API Health: http://localhost:3001/health

You should see:
- ✅ Frontend loads with "Digital Balance" header
- ✅ Health endpoint returns `{"status":"ok"}`

## Step 4: Upload Files (2 minutes)

1. Go to http://localhost:3000
2. You should see the **Upload** tab active
3. Click or drag your files:
   - **Sales File**: Your Excel file (e.g., `VENDAS SETEMBRO.xlsx`)
   - **Bank Statement**: Your PDF file (e.g., `Extracto Bai 02 - Setembro 2025.pdf`)
4. Click **Upload & Process**
5. Wait for success message showing detected month

## Step 5: Explore (2 minutes)

After upload, explore the tabs:

### Dashboard Tab
- View revenue summary cards
- See daily revenue chart
- Check payment methods breakdown
- View top customers and products
- Review VAT summary

### Reconciliation Tab
- See daily card sales vs bank settlements
- Check pass/fail status for each day
- Review overall reconciliation health

### AI Chat Tab
- Click "Generate Report" for instant monthly summary
- Ask questions like:
  - "What was the total revenue?"
  - "Which customer bought the most?"
  - "Show me the top 3 products"
  - "Were there any reconciliation issues?"

## 🎉 Success!

You now have a fully functional AI-powered finance assistant!

## Common Issues & Solutions

### Port Already in Use
Edit `docker-compose.yml`:
```yaml
services:
  fe:
    ports:
      - "3002:3000"  # Change 3000 to 3002
```

### LLM Not Working
- Check `OPENAI_API_KEY` is set correctly in `.env`
- Verify API key is valid and has credits
- For stub mode, responses will be generic

### Files Not Parsing
- Ensure Excel has headers in first row
- Check date format is DD/MM/YYYY
- Verify PDF is text-based (not scanned image)

### Database Errors
Reset everything:
```bash
docker-compose down -v
docker-compose up --build
```

## View Logs

```bash
# All services
docker-compose logs -f

# Just API
docker-compose logs -f api

# Just Frontend
docker-compose logs -f fe
```

## Stop Services

```bash
docker-compose down
```

To also remove data:
```bash
docker-compose down -v
```

## Next Steps

1. **Explore APIs**: Visit http://localhost:3001 and check README for endpoint list
2. **Run Tests**: `cd backend && npm test`
3. **Customize**: Edit components in `frontend/src/components/`
4. **Add Features**: Extend API routes in `backend/src/routes/`

## Need Help?

- 📖 Read the full README.md
- 🐛 Check logs with `docker-compose logs`
- 💬 Open an issue on GitHub

---

**Time to first insight: < 10 minutes! 🎯**

