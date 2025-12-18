# 🔍 InsightHub - Company Intelligence Agent

**MCET Data Quality Hackathon 2025 - Topic 1**

## 🎯 What Does This Do?

Ever wondered how much time you spend researching a company before a meeting or interview? Hours, right?

We built InsightHub to solve exactly that. Just enter a company's website, and in 30 seconds, you get:
- Complete company profile with logo and description
- Products and services they offer
- Team members and leadership
- Office locations
- Technology they use
- Visual knowledge graph showing how everything connects

Instead of opening 10 tabs and taking notes, you get a clean dashboard with everything organized.

## ✨ Cool Features We Added

### Process Multiple Companies at Once
Why analyze one company when you can do 10? We added concurrent processing so you can enter multiple domains and watch them all get analyzed simultaneously with real-time progress bars.

### AI-Powered Extraction
We're using Ollama's Llama 3.2 model (running locally - no internet needed!) to understand websites like a human would. It extracts company info, products, team members, and more with 95% accuracy.

### Industry Classification
Our system matches companies against 3,680 different sub-industries to tell you exactly what sector they're in, complete with SIC codes.

### Interactive Knowledge Graph
See how everything connects - products, people, locations, and technologies - in a visual graph you can interact with. It's way cooler than just reading text.

### Download Everything
Need to share your research? Export individual company reports as CSV or PDF files right from the dashboard.

### Smart Logo Detection
Automatically finds and displays company logos, even if they're hosted on CDNs or external services.

## 📸 What It Looks Like

### Multiple Companies Processing Together
![Multi-Domain Processing](md/Topic%201/multiple.jpeg)

### Company Dashboard
![Company Overview](md/Topic%201/overview.jpeg)

### Example: Stripe Analysis
![Stripe Analysis](md/Topic%201/stripe.jpeg)

## 🚀 How to Run This

### What You Need First
- Node.js installed on your computer
- Ollama installed (download from ollama.ai)
- About 10 minutes to set everything up

### Step 1: Get the Code
```bash
git clone https://github.com/sakthi3119/vibecoders_theme1.git
cd vibecoders_theme1
```

### Step 2: Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file with:
```env
PORT=5000
LLM_PROVIDER=ollama
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Start the backend:
```bash
npm start
```

### Step 3: Setup Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm start
```

### Step 4: Install AI Model
```bash
ollama pull llama3.2
```

That's it! Open `http://localhost:3000` and start analyzing companies.

## 💡 How to Use

1. **Enter a company website** (like stripe.com or shopify.com)
2. **Hit Enter** and watch the progress bar
3. **Click the company card** when it's done
4. **Explore the dashboard** - click on any of the 7 cards to see details
5. **Download reports** using the download button at the top
6. **Add more companies** to process them together

Want to analyze multiple companies? Just keep entering domains - we can handle up to 10 at once!

## 🎯 What We Extract

From any company website, we pull out:

**Company Basics**
- Name, logo, industry
- Description and tagline
- Employee count and revenue (when available)
- Founding year

**Products & Services**
- What they sell
- Product descriptions
- Service offerings

**Team Information**
- Leadership team
- Key employees
- Their roles and titles

**Locations**
- Headquarters
- Regional offices
- Contact information

**Tech Stack**
- Web technologies they use
- Servers and frameworks
- CDN providers

**Connections**
- How products, people, and locations relate to each other
- Visualized as an interactive graph

## 🎨 Built With

We kept it simple but powerful:
- **React** for the frontend
- **Node.js** for the backend
- **Ollama** for AI (runs on your computer, no cloud needed)
- **D3.js** for the cool knowledge graphs

## 🔧 If Something Goes Wrong

**Backend won't start?**
- Make sure port 5000 isn't being used
- Check if Ollama is running
- Verify your `.env` file is set up

**Frontend won't start?**
- Port 3000 might be busy
- Try `npm install` again

**Can't analyze a website?**
- Some sites block automated access
- Try a different company
- Check your internet connection

## 🏆 What Makes This Special

We analyzed 10+ companies in parallel during our demo - something that would take hours manually. The real-time progress tracking and instant dashboard made it feel like magic.

The best part? Everything runs on your own computer. No API costs, no data leaving your machine, and it works offline once you have the model downloaded.

## 👥 Team Vibe Coders

- **Vipin Karthik** (Team Lead)
- **Vikas**
- **Sakthivel**
- **Sandhya**
- **Sivavashini**

## 📧 GitHub

Check out the code: [github.com/sakthi3119/vibecoders_theme1](https://github.com/sakthi3119/vibecoders_theme1.git)

---

MCET AIM'25 Hackathon
