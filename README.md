# Company Intelligence Agent

**Autonomous Company Intelligence Agent** for MCET Hackathon - Topic 1

## 🎯 Problem Statement

Build a system that:
- Takes a company domain (e.g., anfynd.com)
- Scrapes and analyzes the website
- Extracts structured company profile
- Represents data as JSON and knowledge graph
- Displays results in a React UI

## 🏗️ Architecture

```
┌─────────────────┐
│   React UI      │  ← User enters domain
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   REST API      │  POST /analyze
└────────┬────────┘
         │
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐
│  Web Scraper    │      │  Heuristic      │
│  (Cheerio)      │─────▶│  Extractor      │
│                 │      │  (Regex/Meta)   │
└─────────────────┘      └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  LLM Extractor  │
                         │  (GPT/Claude)   │
                         └────────┬────────┘
                                  │
                         ┌────────┴────────┐
                         │                 │
                         ▼                 ▼
                ┌─────────────────┐ ┌─────────────────┐
                │  Company JSON   │ │ Knowledge Graph │
                │  (Strict Schema)│ │ (Nodes + Edges) │
                └─────────────────┘ └─────────────────┘
```

## 📦 Tech Stack

**Backend:**
- Node.js + Express
- Axios (HTTP requests)
- Cheerio (HTML parsing)
- OpenAI/Anthropic Claude (LLM extraction)

**Frontend:**
- React 18
- Axios (API calls)
- CSS3 (styling)

## 🚀 Setup Instructions

### Prerequisites
- Node.js 16+ installed
- Ollama running (local or cloud) with `gpt-oss:20b` model
  - OR OpenAI API key
  - OR Anthropic API key

### Backend Setup

1. Navigate to backend folder:
```powershell
cd backend
```

2. Install dependencies:
```powershell
npm install
```

3. Create `.env` file:
```powershell
cp .env.example .env
```

4. Edit `.env` and configure your LLM:

**For Ollama (default):**
```env
PORT=5000
LLM_PROVIDER=ollama
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```


5. Start the backend:
```powershell
npm start
```

Backend runs at `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend folder:
```powershell
cd frontend
```

2. Install dependencies:
```powershell
npm install
```

3. Start the frontend:
```powershell
npm start
```

Frontend runs at `http://localhost:3000`

## 📝 API Endpoints

### Single Analysis
```
POST /api/analyze
Content-Type: application/json

{
  "domain": "anfynd.com"
}

Response:
{
  "success": true,
  "data": {
    "company": { ... },
    "graph": {
      "nodes": [...],
      "edges": [...]
    }
  }
}
```

### Batch Analysis
```
POST /api/analyze/batch
Content-Type: application/json

{
  "domains": ["anfynd.com", "example.com", "company.org"]
}

Response:
{
  "success": true,
  "results": [
    { "domain": "anfynd.com", "success": true, "data": {...} },
    { "domain": "example.com", "success": true, "data": {...} },
    ...
  ]
}
```

## 📋 JSON Schema

```json
{
  "company": {
    "name": "string",
    "domain": "string",
    "logo_url": "string",
    "short_description": "string",
    "long_description": "string",
    "industry": "string",
    "sub_industry": "string"
  },
  "products_services": [
    {
      "name": "string",
      "description": "string"
    }
  ],
  "locations": {
    "headquarters": "string",
    "offices": ["string"]
  },
  "people": [
    {
      "name": "string",
      "title": "string",
      "role_category": "Leadership|Engineering|Sales|Marketing|Other"
    }
  ],
  "contact": {
    "emails": ["string"],
    "phones": ["string"],
    "contact_page": "string"
  },
  "social_media": {
    "linkedin": "string",
    "twitter": "string",
    "facebook": "string",
    "instagram": "string"
  },
  "tech_stack": ["string"]
}
```

## 🔍 Knowledge Graph Structure

**Node Types:**
- Company
- Product
- Person
- Location
- Technology

**Edge Types:**
- `HAS_PRODUCT` (Company → Product)
- `HEADQUARTERED_AT` (Company → Location)
- `HAS_OFFICE` (Company → Location)
- `WORKS_AT` (Person → Company)
- `USES_TECH` (Company → Technology)

## 🎨 UI Features

- **Domain Input**: Enter company domain
- **Recent History**: Quick access to analyzed companies
- **Summary Card**: Company overview with logo, industry, description
- **Tabs**:
  - Overview (description, contact, social)
  - Products & Services
  - People (team members)
  - Locations (headquarters, offices)
  - Tech Stack
  - Knowledge Graph (visual + JSON)

## 🧪 Testing

Test with sample domains:
- `stripe.com`
- `openai.com`
- `anthropic.com`
- `vercel.com`

## ⚙️ Configuration

### LLM Provider

Switch between Ollama, OpenAI, and Anthropic in `.env`:

```env
# For Ollama (Local or Cloud)
LLM_PROVIDER=ollama
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b

# For OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# For Anthropic (Claude)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

**If using cloud Ollama**, update `OLLAMA_API_URL` to your cloud endpoint.

### Scraper Settings

Edit `backend/services/scraper.js`:
- `maxPages`: Maximum pages to scrape (default: 10)
- `timeout`: Request timeout in ms (default: 10000)
- `navKeywords`: Keywords for navigation link detection

## 🎯 Key Features

✅ **Scraping**: Follows internal navigation links (About, Products, Contact, etc.)  
✅ **Heuristic Extraction**: Regex for emails/phones, meta tags, tech stack detection  
✅ **LLM Extraction**: Structured JSON output with strict schema  
✅ **Knowledge Graph**: Nodes + edges representation  
✅ **Error Handling**: Graceful failures, partial results  
✅ **Batch Processing**: Analyze multiple domains sequentially  
✅ **Clean UI**: React with tabs, cards, and graph visualization  

## 📊 Sample Output

```json
{
  "company": {
    "name": "Stripe",
    "domain": "https://stripe.com",
    "industry": "Financial Technology",
    "short_description": "Online payment processing platform"
  },
  "products_services": [
    { "name": "Payments", "description": "Accept payments online" },
    { "name": "Billing", "description": "Subscription management" }
  ],
  "tech_stack": ["React", "Node.js", "Ruby"]
}
```

## 🔧 Troubleshooting

**Backend won't start:**
- Check if port 5000 is available
- Verify `.env` file exists with correct LLM configuration
- For Ollama: ensure Ollama is running (`ollama serve`)

**Frontend won't start:**
- Check if port 3000 is available
- Run `npm install` again

**LLM extraction fails:**
- **Ollama**: Check if Ollama is running and model is pulled (`ollama pull gpt-oss:20b`)
- **OpenAI/Anthropic**: Verify API key is valid
- Check internet connection (for cloud APIs)
- Review backend logs for error details

**Ollama-specific issues:**
- Run `ollama list` to verify `gpt-oss:20b` is available
- If using cloud Ollama, verify `OLLAMA_API_URL` is correct
- Increase timeout if model is slow (already set to 2 minutes)

**Scraping fails:**
- Domain might be blocking requests
- Try different domain
- Check if website is accessible

## 📁 Project Structure

```
MCET_Final/
├── backend/
│   ├── routes/
│   │   └── analyze.js
│   ├── services/
│   │   ├── scraper.js
│   │   ├── heuristicExtractor.js
│   │   ├── llmExtractor.js
│   │   └── graphGenerator.js
│   ├── server.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── CompanyView.js
    │   │   └── GraphView.js
    │   ├── App.js
    │   └── index.js
    └── package.json
```

## 🏆 Hackathon Demo Checklist

- [ ] Backend running on `localhost:5000`
- [ ] Frontend running on `localhost:3000`
- [ ] API key configured
- [ ] Test with 2-3 sample domains
- [ ] Show JSON output
- [ ] Show knowledge graph
- [ ] Explain scraping → heuristic → LLM flow
- [ ] Demonstrate batch analysis
- [ ] Show error handling (invalid domain)

## 📄 License

MIT License - Built for MCET Hackathon 2025

---

**Built with ❤️ for MCET Hackathon - Topic 1**
