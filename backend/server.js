import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, saveReport, getHistory, getReportById } from './lib/db.js';
import { runResearchAgent } from './lib/agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// Health check endpoint for Render monitoring
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 1. Run research workflow for a company name
app.post('/api/research', async (req, res) => {
  const { companyName } = req.body;
  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    return res.status(400).json({ error: 'Company name is required.' });
  }

  try {
    console.log(`Received research request for: "${companyName}"`);
    
    // Run the LangGraph agent workflow
    const result = await runResearchAgent(companyName.trim());
    
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    
    // Save report to database (abstracted helper handles PG or JSON DB automatically)
    const savedReport = await saveReport({
      companyName: result.companyName,
      ticker: result.ticker,
      recommendation: result.report.recommendation,
      confidence: result.report.confidence,
      horizon: result.report.horizon,
      riskLevel: result.report.riskLevel,
      scores: result.report.scores,
      confidenceExplanation: result.report.confidenceExplanation,
      companySnapshot: result.report.companySnapshot,
      metrics: result.report.metrics,
      pros: result.report.pros,
      cons: result.report.cons,
      whyNotInvest: result.report.whyNotInvest,
      competitors: result.report.competitors,
      executionTime: result.executionTime,
      reasoning: result.report.reasoning
    });
    
    console.log(`Saved report for ${result.companyName} (${result.ticker}) to database.`);
    
    return res.status(200).json(savedReport);
  } catch (error) {
    console.error('Error running research agent API:', error);
    return res.status(500).json({ error: error.message || 'An internal error occurred during research.' });
  }
});

// 2. Fetch history of reports (meta information only for list optimization)
app.get('/api/history', async (req, res) => {
  try {
    const history = await getHistory();
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching report history:', error);
    return res.status(500).json({ error: 'Failed to fetch report history.' });
  }
});

// 3. Fetch a specific full report by ID
app.get('/api/report/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const report = await getReportById(id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    
    return res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching report details:', error);
    return res.status(500).json({ error: 'Failed to fetch report details.' });
  }
});

// Initialize DB and Start Server
async function startServer() {
  console.log('Initializing database connection...');
  await initDb();
  
  app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
  });
}

startServer();
