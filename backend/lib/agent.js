import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import yahooFinance from 'yahoo-finance2';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Define the State Schema using LangGraph Annotation
export const ResearchState = Annotation.Root({
  companyName: Annotation(),
  ticker: Annotation(),
  companyDetails: Annotation(),
  financials: Annotation(),
  news: Annotation(),
  report: Annotation(),
  error: Annotation(),
});

// System prompts for Gemini
const systemPrompt = `You are a Senior Investment Research Analyst and Venture Capital Partner.
Your job is to perform a thorough investment analysis on a company based on its financial metrics and recent news, and decide whether to INVEST, PASS, or HOLD.

You must respond ONLY with a valid JSON object. Do not include any conversational text outside the JSON object.
The JSON object must have exactly the following keys:
{
  "recommendation": "INVEST" | "HOLD" | "PASS",
  "confidence": number (between 0 and 100, indicating your level of certainty),
  "reasoning": "A detailed investment report in Markdown format. Use clear headings, bullet points, and tables. Your report must contain these sections:
    1. Executive Summary: Why this decision was made.
    2. Financial Analysis: Insights on the P/E ratio, market cap, growth rates, margins, leverage (Debt/Equity), and valuation.
    3. News & Catalyst Analysis: Synthesis of recent events, product announcements, and sentiment.
    4. Risks & Red Flags: Potential downsides, valuation concerns, or competitive threats.
    5. Final Verdict & Catalysts to Watch: Summary of what would change your thesis."
}

Ensure the "reasoning" is detailed, professional, and well-structured. Do not skip details. Use markdown bolding and bullet points to make it highly readable.`;

// Nodes Implementation

// Node 1: Resolve Company Name to Ticker
async function resolveTicker(state) {
  const query = state.companyName.trim();
  const isTickerPattern = /^[A-Z0-9.-]{1,12}$/i.test(query);

  try {
    console.log(`[LangGraph] Resolving ticker for: "${query}"`);
    const searchResults = await yahooFinance.search(query);
    
    // Filter quotes for EQUITY or find the first valid match
    const quotes = searchResults.quotes || [];
    const equityQuote = quotes.find(q => (q.quoteType === 'EQUITY' || q.quoteType === 'INDEX') && q.symbol);
    const selectedQuote = equityQuote || quotes.find(q => q.symbol);
    
    if (!selectedQuote) {
      if (isTickerPattern) {
        console.log(`[LangGraph] No search results, but query looks like a ticker. Using it directly.`);
        return {
          ticker: query.toUpperCase(),
          companyDetails: {
            symbol: query.toUpperCase(),
            name: query.toUpperCase(),
            exchange: 'N/A',
            quoteType: 'EQUITY'
          }
        };
      }
      throw new Error(`Could not find a ticker symbol for company: "${query}"`);
    }
    
    console.log(`[LangGraph] Resolved ticker: ${selectedQuote.symbol} (${selectedQuote.longname || selectedQuote.shortname})`);
    
    return {
      ticker: selectedQuote.symbol,
      companyDetails: {
        symbol: selectedQuote.symbol,
        name: selectedQuote.longname || selectedQuote.shortname || query,
        exchange: selectedQuote.exchange,
        quoteType: selectedQuote.quoteType
      }
    };
  } catch (error) {
    console.error(`[LangGraph] Error resolving ticker: ${error.message}`);
    
    if (isTickerPattern) {
      console.log(`[LangGraph] Search failed, but query "${query}" looks like a ticker. Using it directly.`);
      return {
        ticker: query.toUpperCase(),
        companyDetails: {
          symbol: query.toUpperCase(),
          name: query.toUpperCase(),
          exchange: 'N/A',
          quoteType: 'EQUITY'
        }
      };
    }
    
    // LLM Fallback: Try resolving using Gemini
    try {
      console.log(`[LangGraph] Attempting LLM ticker resolution fallback for: "${query}"`);
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey) {
        const model = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          temperature: 0.1,
          apiKey: apiKey
        });
        
        const prompt = `You are a financial database mapper. Resolve the company name "${query}" to its stock ticker symbol. 
Respond with ONLY a valid JSON object matching this structure:
{
  "ticker": "uppercase ticker symbol (e.g., RELIANCE.NS, TSLA, AAPL)",
  "name": "full official company name",
  "exchange": "main exchange name"
}
Do not include any other text or markdown formatting. Just return the JSON.`;
        
        const response = await model.invoke(prompt);
        const text = response.content || '';
        const cleaned = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        
        if (parsed.ticker) {
          console.log(`[LangGraph] LLM Fallback successfully resolved ticker: ${parsed.ticker} for "${query}"`);
          return {
            ticker: parsed.ticker.toUpperCase(),
            companyDetails: {
              symbol: parsed.ticker.toUpperCase(),
              name: parsed.name || query,
              exchange: parsed.exchange || 'N/A',
              quoteType: 'EQUITY'
            }
          };
        }
      }
    } catch (llmError) {
      console.error(`[LangGraph] LLM Ticker Resolution fallback failed:`, llmError);
    }

    let userFriendlyError = error.message;
    if (error.message.includes('Too Many Requests') || error.message.includes('invalid json response')) {
      userFriendlyError = `Yahoo Finance search is rate-limited. Please try searching using the direct ticker symbol (e.g., TSLA, AAPL, NVDA) instead of the company name.`;
    }
    
    return { error: `Ticker resolution failed: ${userFriendlyError}` };
  }
}

// Node 2: Fetch Financial Data from Yahoo Finance
async function fetchFinancials(state) {
  if (state.error) return {};
  const ticker = state.ticker;
  try {
    console.log(`[LangGraph] Fetching financials for: ${ticker}`);
    
    // Fetch quote
    const quote = await yahooFinance.quote(ticker).catch(e => {
      console.warn(`[LangGraph] Quote fetch failed for ${ticker}, using fallback: ${e.message}`);
      return {};
    });
    
    // Fetch summary modules
    const summary = await yahooFinance.quoteSummary(ticker, {
      modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics', 'assetProfile']
    }).catch(e => {
      console.warn(`[LangGraph] Summary modules fetch failed for ${ticker}: ${e.message}`);
      return {};
    });
    
    const detail = summary.summaryDetail || {};
    const finData = summary.financialData || {};
    const stats = summary.defaultKeyStatistics || {};
    const profile = summary.assetProfile || {};

    const financials = {
      price: quote.regularMarketPrice || finData.currentPrice || null,
      marketCap: quote.marketCap || detail.marketCap || null,
      peRatio: quote.trailingPE || detail.trailingPE || null,
      forwardPe: detail.forwardPE || null,
      priceToSales: detail.priceToSalesTrailing12Months || null,
      priceToBook: stats.priceToBook || null,
      enterpriseValue: stats.enterpriseValue || null,
      ebitda: finData.ebitda || null,
      debtToEquity: finData.debtToEquity || null,
      quickRatio: finData.quickRatio || null,
      currentRatio: finData.currentRatio || null,
      revenueGrowth: finData.revenueGrowth || null,
      earningsGrowth: finData.earningsGrowth || null,
      profitMargin: finData.profitMargins || null,
      operatingMargin: finData.operatingMargins || null,
      eps: stats.trailingEps || null,
      dividendYield: detail.dividendYield || null,
      fiftyTwoWeekHigh: detail.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow: detail.fiftyTwoWeekLow || null,
    };
    
    const companyDetails = {
      ...state.companyDetails,
      name: quote.longName || quote.shortName || profile.longName || state.companyDetails?.name || ticker,
      sector: profile.sector || 'N/A',
      industry: profile.industry || 'N/A',
      description: profile.longBusinessSummary || 'No description available.',
      website: profile.website || 'N/A',
      employees: profile.fullTimeEmployees || null
    };

    console.log(`[LangGraph] Successfully fetched financials for ${ticker}`);
    
    return {
      financials,
      companyDetails
    };
  } catch (error) {
    console.error(`[LangGraph] Error fetching financials: ${error.message}`);
    return { error: `Financials fetch failed: ${error.message}` };
  }
}

// Node 3: Fetch Recent News from Tavily
async function fetchNews(state) {
  if (state.error) return {};
  const query = `${state.companyDetails?.name || state.companyName} stock investment analysis recent news`;
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.warn("[LangGraph] TAVILY_API_KEY is not defined. Using mock financial news for research.");
    const mockNews = [
      {
        title: `${state.companyDetails?.name || state.companyName} Expands Market Footprint with New Products`,
        url: "https://finance.yahoo.com",
        content: `Industry analysts are positive about ${state.companyDetails?.name || state.companyName}'s latest strategic moves. The company continues to show strong product adoption and solid margins, despite macro headwinds.`,
        score: 0.95
      },
      {
        title: `What Wall Street Expects from ${state.companyDetails?.name || state.companyName} Next Quarter`,
        url: "https://bloomberg.com",
        content: `Earnings expectations remain high for ${state.companyDetails?.name || state.companyName}. Researchers highlight potential revenue upside driven by new enterprise contract wins and improved operational efficiency.`,
        score: 0.90
      },
      {
        title: `Technical Analysis: ${state.companyDetails?.name || state.companyName} Stock Consolidation Pattern`,
        url: "https://investopedia.com",
        content: `Shares of ${state.companyDetails?.name || state.companyName} are forming a classic bullish flag pattern. Support levels are holding strong, pointing to potential upside breakout in the coming weeks.`,
        score: 0.82
      }
    ];
    return { news: mockNews };
  }
  
  try {
    console.log(`[LangGraph] Fetching news from Tavily for: "${state.companyDetails?.name || state.companyName}"`);
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        max_results: 5,
        search_depth: "advanced"
      })
    });
    
    if (!response.ok) {
      throw new Error(`Tavily API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    const results = data.results || [];
    
    const formattedNews = results.map(item => ({
      title: item.title || 'Recent Update',
      url: item.url || 'https://finance.yahoo.com',
      content: item.content || '',
      score: item.score || 1.0
    }));
    
    console.log(`[LangGraph] Successfully fetched ${formattedNews.length} news articles.`);
    return { news: formattedNews };
  } catch (error) {
    console.error(`[LangGraph] Error fetching news from Tavily: ${error.message}`);
    return { 
      news: [],
      error: `Tavily Search Warning: ${error.message}. Proceeding with financials only.` 
    };
  }
}

// Node 4: Generate Report using Gemini Reasoner
async function generateReport(state) {
  // If there's a fatal error (like no ticker resolved), skip LLM
  if (state.error && !state.ticker) return {};
  
  try {
    console.log(`[LangGraph] Generating investment report using Gemini for: ${state.ticker}`);
    
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[LangGraph] GOOGLE_API_KEY / GEMINI_API_KEY is not defined. Using mock report generator.");
      
      const peString = state.financials?.peRatio ? state.financials.peRatio : 23.2;
      const mcapString = state.financials?.marketCap ? `${(state.financials.marketCap / 1e9).toFixed(2)}B` : "2.89T";
      const growthString = state.financials?.revenueGrowth ? `${(state.financials.revenueGrowth * 100).toFixed(1)}%` : "14%";
      const priceVal = state.financials?.price || 390.83;
      
      const mockReport = {
        recommendation: "HOLD",
        confidence: 65,
        horizon: "3-5 Years",
        riskLevel: "Medium",
        scores: {
          financialHealth: 75,
          growth: 70,
          valuation: 65,
          risk: 60,
          newsSentiment: 68,
          overall: 67
        },
        confidenceExplanation: "Generated as mock data due to missing API keys.",
        companySnapshot: {
          sector: state.companyDetails?.sector || "Technology",
          industry: state.companyDetails?.industry || "Software-Infrastructure",
          ceo: "Satya Nadella",
          employees: "228,000",
          ticker: state.ticker || "MSFT",
          exchange: "NASDAQ",
        },
        metrics: {
          price: priceVal,
          marketCap: mcapString,
          peRatio: peString,
          revenueGrowth: growthString,
          profitMargin: "21%",
          debtToEquity: "80%",
        },
        pros: [
          "Stable enterprise contract cashflows",
          "Established cloud market footprint",
          "Defensible business segment moat"
        ],
        cons: [
          "Growth rates normalizing post-pandemic",
          "Increased competitive R&D spending",
          "Potential valuation multiple contraction"
        ],
        whyNotInvest: [
          "Cloud market share loss to competitors",
          "Margin compression due to AI compute costs",
          "Macroeconomic enterprise spending slowdown"
        ],
        competitors: [
          { name: "Apple", marketCap: "3.4T", peRatio: "31", revenueGrowth: "11%", recommendation: "Invest" },
          { name: "Google", marketCap: "2.1T", peRatio: "28", revenueGrowth: "13%", recommendation: "Hold" },
          { name: "Nvidia", marketCap: "3.9T", peRatio: "44", revenueGrowth: "69%", recommendation: "Hold" }
        ],
        reasoning: `# Investment Research Report: ${state.companyDetails?.name || state.ticker} (${state.ticker})
        
> [!WARNING]
> **API Key Missing**
> This is a mock report generated because no \`GOOGLE_API_KEY\` or \`GEMINI_API_KEY\` was configured.

## Executive Summary
${state.companyDetails?.name || state.ticker} exhibits stable fundamentals but we are issuing a **HOLD** recommendation. To see full, active research analysis powered by Gemini 2.5 Flash, please add your \`GOOGLE_API_KEY\` to your \`.env\` file.

## Financial Analysis
- **Current Price**: $${priceVal}
- **Market Capitalization**: ${mcapString}
- **P/E Ratio (Trailing)**: ${peString}
- **Revenue Growth (YoY)**: ${growthString}

## News & Catalyst Analysis
We reviewed ${state.news?.length || 0} news items. The general sentiment is neutral. Major catalysts are pending upcoming earnings announcements.

## Risks & Red Flags
- Valuation may be fully priced relative to historical averages.
- Potential macroeconomic slowdown could impact discretionary corporate spending.

## Final Verdict
Maintain a **HOLD** position on ${state.ticker} until further growth trends are validated.`
      };
      return { report: mockReport };
    }

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0.1,
      apiKey: apiKey
    });
    
    const reportSchema = z.object({
      recommendation: z.enum(["INVEST", "HOLD", "PASS"]).describe("The investment recommendation decision"),
      confidence: z.number().int().min(0).max(100).describe("Confidence score between 0 and 100"),
      horizon: z.string().describe("Expected investment horizon, e.g. '3-5 Years' or '1-2 Years'"),
      riskLevel: z.enum(["Low", "Medium", "High"]).describe("Risk level assessment"),
      scores: z.object({
        financialHealth: z.number().int().min(0).max(100).describe("Score out of 100 for balance sheet & margins"),
        growth: z.number().int().min(0).max(100).describe("Score out of 100 for revenue and earnings expansion"),
        valuation: z.number().int().min(0).max(100).describe("Score out of 100 for price multiple relative to value"),
        risk: z.number().int().min(0).max(100).describe("Score out of 100 representing downside safety (higher is safer)"),
        newsSentiment: z.number().int().min(0).max(100).describe("Score out of 100 representing media sentiment"),
        overall: z.number().int().min(0).max(100).describe("Weighted aggregate score"),
      }),
      confidenceExplanation: z.string().describe("A brief 1-2 sentence explanation of the confidence rating"),
      companySnapshot: z.object({
        sector: z.string(),
        industry: z.string(),
        ceo: z.string().describe("Current CEO name"),
        employees: z.string().describe("Full-time employees count, e.g. '228,000'"),
        ticker: z.string(),
        exchange: z.string(),
      }),
      metrics: z.object({
        price: z.number().nullable().describe("Current stock price in USD"),
        marketCap: z.string().describe("Market capitalization, e.g. '2.89T' or '540B'"),
        peRatio: z.number().nullable().describe("Price-to-Earnings ratio"),
        revenueGrowth: z.string().describe("Revenue growth rate YoY, e.g. '15%' or '-2%'"),
        profitMargin: z.string().describe("Profit margin, e.g. '21%'"),
        debtToEquity: z.string().describe("Debt-to-equity ratio, e.g. '80%'"),
      }),
      pros: z.array(z.string()).max(4).describe("List of 3-4 primary investment drivers"),
      cons: z.array(z.string()).max(4).describe("List of 3-4 primary investment risks"),
      whyNotInvest: z.array(z.string()).max(4).describe("What downside triggers or events would break the positive thesis"),
      competitors: z.array(z.object({
        name: z.string().describe("Competitor name"),
        marketCap: z.string().describe("Market cap, e.g. '3.2T'"),
        peRatio: z.string().describe("P/E ratio, e.g. '32' or 'N/A'"),
        revenueGrowth: z.string().describe("Revenue growth YoY, e.g. '12%'"),
        recommendation: z.string().describe("Our stance, e.g. 'Invest', 'Hold', 'Pass'")
      })).max(3).describe("List of 3 major industry competitors"),
      reasoning: z.string().describe("Concise, high-impact markdown thesis, strictly under 350 words")
    });

    const structuredModel = model.withStructuredOutput(reportSchema);
    
    const humanPrompt = `Analyze the following company:
Company: ${state.companyDetails?.name || state.ticker} (${state.ticker})
Sector: ${state.companyDetails?.sector || 'N/A'} | Industry: ${state.companyDetails?.industry || 'N/A'}
Description: ${state.companyDetails?.description || 'N/A'}

Financial Metrics:
${JSON.stringify(state.financials, null, 2)}

Recent News & Sentiment:
${JSON.stringify(state.news, null, 2)}

Provide your final investment decision matching the structured schema. If any financial metrics (like price, marketCap, peRatio, revenueGrowth) were missing (e.g. null or N/A) in the inputs, search your knowledge base or estimate them realistically based on news, rather than leaving them null. Ensure the competitors array has 3 primary competitors.`;

    const messages = [
      ["system", "You are a Senior Investment Research Analyst and Venture Capital Partner. Your job is to perform a thorough investment analysis on a company based on its financial metrics and recent news, and decide whether to INVEST, PASS, or HOLD. Structure your response according to the requested schema. Ensure the 'reasoning' section is a high-impact, concise markdown thesis (strictly under 350 words) structured with clear headings: Executive Summary, Financial Assessment, Key Catalysts, and Risks."],
      ["human", humanPrompt]
    ];
    
    const response = await structuredModel.invoke(messages);
    
    console.log(`[LangGraph] Successfully generated report. Recommendation: ${response.recommendation}`);
    
    return {
      report: response
    };
  } catch (error) {
    console.error(`[LangGraph] Error generating report:`, error);
    return { error: `Report generation failed: ${error.message}` };
  }
}

// Build the LangGraph StateGraph
const graph = new StateGraph(ResearchState)
  .addNode("resolveTicker", resolveTicker)
  .addNode("fetchFinancials", fetchFinancials)
  .addNode("fetchNews", fetchNews)
  .addNode("generateReport", generateReport)
  .addEdge(START, "resolveTicker")
  .addEdge("resolveTicker", "fetchFinancials")
  .addEdge("resolveTicker", "fetchNews")
  .addEdge("fetchFinancials", "generateReport")
  .addEdge("fetchNews", "generateReport")
  .addEdge("generateReport", END)
  .compile();

/**
 * Runs the investment research agent workflow
 * @param {string} companyName 
 * @returns {Promise<object>} The final compiled research state
 */
export async function runResearchAgent(companyName) {
  const startTime = Date.now();
  try {
    console.log(`[LangGraph] Initializing research graph for query: "${companyName}"`);
    const finalState = await graph.invoke({ companyName });
    
    const endTime = Date.now();
    const executionTime = parseFloat(((endTime - startTime) / 1000).toFixed(2));
    
    if (finalState.report) {
      finalState.report.executionTime = executionTime;
    }
    
    return {
      companyName: finalState.companyDetails?.name || companyName,
      ticker: finalState.ticker || 'N/A',
      financials: finalState.financials || {},
      news: finalState.news || [],
      report: finalState.report || { recommendation: 'HOLD', confidence: 50, reasoning: 'No report generated.' },
      executionTime,
      error: finalState.error
    };
  } catch (err) {
    console.error("[LangGraph] Graph invocation failed:", err);
    return { error: `Workflow failed: ${err.message}` };
  }
}
