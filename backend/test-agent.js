import { runResearchAgent } from './lib/agent.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
  const company = process.argv[2] || 'Tesla';
  console.log(`=== Testing LangGraph Research Agent for "${company}" ===`);
  
  const startTime = Date.now();
  const result = await runResearchAgent(company);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n--- Execution Finished ---');
  console.log(`Duration: ${duration}s (Workflow Time: ${result.executionTime}s)`);
  
  if (result.error) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
  
  console.log(`Resolved Ticker: ${result.ticker}`);
  console.log(`Company Name: ${result.companyName}`);
  
  const snapshot = result.report?.companySnapshot || {};
  console.log(`Sector: ${snapshot.sector || 'N/A'} | Industry: ${snapshot.industry || 'N/A'}`);
  console.log(`CEO: ${snapshot.ceo || 'N/A'} | Employees: ${snapshot.employees || 'N/A'} | Exchange: ${snapshot.exchange || 'N/A'}`);
  
  console.log('\n--- Financials Extracted (No N/A Fallback) ---');
  const metrics = result.report?.metrics || {};
  console.log(`Price: $${metrics.price || 'N/A'}`);
  console.log(`Market Cap: ${metrics.marketCap || 'N/A'}`);
  console.log(`P/E Ratio: ${metrics.peRatio || 'N/A'}`);
  console.log(`Revenue Growth: ${metrics.revenueGrowth || 'N/A'}`);
  console.log(`Profit Margin: ${metrics.profitMargin || 'N/A'}`);
  console.log(`Debt to Equity: ${metrics.debtToEquity || 'N/A'}`);
  
  console.log('\n--- AI Scorecards ---');
  const scores = result.report?.scores || {};
  console.log(`Financial Health: ${scores.financialHealth}/100`);
  console.log(`Growth: ${scores.growth}/100`);
  console.log(`Valuation: ${scores.valuation}/100`);
  console.log(`Risk Score: ${scores.risk}/100`);
  console.log(`News Sentiment: ${scores.newsSentiment}/100`);
  console.log(`Overall Rating: ${scores.overall}/100`);

  console.log('\n--- Competitors Comparison ---');
  const competitors = result.report?.competitors || [];
  competitors.forEach(c => {
    console.log(`- ${c.name} | Cap: ${c.marketCap} | PE: ${c.peRatio} | Growth: ${c.revenueGrowth} | Stance: ${c.recommendation}`);
  });

  console.log('\n--- Tavily News Scraped ---');
  console.log(`Total Articles: ${result.news?.length || 0}`);
  if (result.news && result.news.length > 0) {
    result.news.slice(0, 2).forEach((item, i) => {
      try {
        console.log(`  ${i+1}. ${item.title} (${new URL(item.url).hostname})`);
      } catch (e) {
        console.log(`  ${i+1}. ${item.title}`);
      }
    });
  }
  
  console.log('\n--- AI Report Verdict ---');
  console.log(`Recommendation: ${result.report?.recommendation}`);
  console.log(`Confidence: ${result.report?.confidence}%`);
  console.log(`Horizon: ${result.report?.horizon} | Risk Level: ${result.report?.riskLevel}`);
  console.log(`Explanation: ${result.report?.confidenceExplanation}`);
  
  console.log('\n--- AI Reasoning Outline ---');
  console.log((result.report?.reasoning || '').substring(0, 250) + '...\n');
  
  process.exit(0);
}

main().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
