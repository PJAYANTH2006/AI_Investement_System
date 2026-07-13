import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

let pool = null;
let usePostgres = false;
const jsonDbPath = path.resolve(__dirname, '../db.json');

// Function to initialize the database (PG or local JSON file fallback)
export async function initDb() {
  if (!connectionString) {
    console.log('[Database] DATABASE_URL is not set. Falling back to local JSON database.');
    setupJsonDb();
    return;
  }

  let dbName = 'ai_investment_research';
  let baseUrl = 'postgresql://postgres:postgres@localhost:5432';
  
  try {
    const lastSlash = connectionString.lastIndexOf('/');
    const questionMark = connectionString.indexOf('?', lastSlash);
    if (lastSlash !== -1) {
      baseUrl = connectionString.substring(0, lastSlash);
      dbName = questionMark !== -1 
        ? connectionString.substring(lastSlash + 1, questionMark)
        : connectionString.substring(lastSlash + 1);
    }
  } catch (e) {
    // ignore parsing errors
  }

  // 1. Connect to postgres default database first to check/create the target database
  const systemPool = new Pool({
    connectionString: `${baseUrl}/postgres`,
    connectionTimeoutMillis: 3000
  });

  try {
    const client = await systemPool.connect();
    const dbCheck = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    
    if (dbCheck.rows.length === 0) {
      console.log(`[Database] Database "${dbName}" does not exist. Creating it...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`[Database] Database "${dbName}" created successfully.`);
    }
    client.release();
  } catch (err) {
    console.warn(`[Database] PostgreSQL database check warning: ${err.message}`);
  } finally {
    await systemPool.end().catch(() => {});
  }

  // 2. Connect to the target database and create the table
  pool = new Pool({ 
    connectionString,
    connectionTimeoutMillis: 3000
  });

  try {
    console.log('[Database] Testing PostgreSQL connection...');
    const client = await pool.connect();
    
    // Check if the 'horizon' column exists in reports (migration check)
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'reports'
      );
    `);

    if (tableExists.rows[0].exists) {
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='reports' AND column_name='horizon';
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('[Database] Upgrading table schema. Dropping old simple "reports" table...');
        await client.query('DROP TABLE IF EXISTS reports CASCADE;');
      }
    }

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        ticker VARCHAR(50) NOT NULL,
        recommendation VARCHAR(50) NOT NULL,
        confidence INT NOT NULL,
        horizon VARCHAR(100) NOT NULL,
        risk_level VARCHAR(50) NOT NULL,
        scores JSONB NOT NULL,
        confidence_explanation TEXT NOT NULL,
        company_snapshot JSONB NOT NULL,
        metrics JSONB NOT NULL,
        pros JSONB NOT NULL,
        cons JSONB NOT NULL,
        why_not_invest JSONB NOT NULL,
        competitors JSONB NOT NULL,
        execution_time NUMERIC(5,2) NOT NULL,
        reasoning TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableQuery);
    console.log(`[Database] Connected successfully! PostgreSQL table "reports" is ready in database "${dbName}".`);
    usePostgres = true;
    client.release();
  } catch (err) {
    console.error(`[Database] PostgreSQL connection failed: ${err.message}`);
    console.log('[Database] !!! FALLING BACK TO LOCAL JSON DATABASE (backend/db.json) !!!');
    usePostgres = false;
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }
    setupJsonDb();
  }
}

function setupJsonDb() {
  if (!fs.existsSync(jsonDbPath)) {
    fs.writeFileSync(jsonDbPath, JSON.stringify({ reports: [] }, null, 2), 'utf8');
    console.log(`[Database] Local JSON database created at: ${jsonDbPath}`);
  } else {
    // If the database has reports with the old schema (lacking 'horizon'), clear it to upgrade
    try {
      const data = fs.readFileSync(jsonDbPath, 'utf8');
      const db = JSON.parse(data);
      if (db.reports && db.reports.length > 0 && db.reports[0].horizon === undefined) {
        console.log('[Database] Local JSON database has old schema. Clearing and upgrading...');
        fs.writeFileSync(jsonDbPath, JSON.stringify({ reports: [] }, null, 2), 'utf8');
      } else {
        console.log(`[Database] Local JSON database found at: ${jsonDbPath}`);
      }
    } catch (e) {
      fs.writeFileSync(jsonDbPath, JSON.stringify({ reports: [] }, null, 2), 'utf8');
    }
  }
}

// Read local JSON file database
function readJsonDb() {
  try {
    const data = fs.readFileSync(jsonDbPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { reports: [] };
  }
}

// Write local JSON file database
function writeJsonDb(data) {
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[Database] Failed to write to JSON database:', e.message);
  }
}

// DB Operations abstraction

/**
 * Saves a generated report
 * @param {object} reportData 
 * @returns {Promise<object>} Saved report row
 */
export async function saveReport(reportData) {
  if (usePostgres && pool) {
    const insertQuery = `
      INSERT INTO reports (
        company_name, ticker, recommendation, confidence, horizon, risk_level, 
        scores, confidence_explanation, company_snapshot, metrics, pros, cons, 
        why_not_invest, competitors, execution_time, reasoning
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    const dbResult = await pool.query(insertQuery, [
      reportData.companyName,
      reportData.ticker,
      reportData.recommendation,
      reportData.confidence,
      reportData.horizon,
      reportData.riskLevel,
      JSON.stringify(reportData.scores),
      reportData.confidenceExplanation,
      JSON.stringify(reportData.companySnapshot),
      JSON.stringify(reportData.metrics),
      JSON.stringify(reportData.pros),
      JSON.stringify(reportData.cons),
      JSON.stringify(reportData.whyNotInvest),
      JSON.stringify(reportData.competitors),
      reportData.executionTime,
      reportData.reasoning
    ]);
    return dbResult.rows[0];
  } else {
    // JSON Fallback
    const db = readJsonDb();
    const newReport = {
      id: db.reports.length + 1,
      company_name: reportData.companyName,
      ticker: reportData.ticker,
      recommendation: reportData.recommendation,
      confidence: reportData.confidence,
      horizon: reportData.horizon,
      risk_level: reportData.riskLevel,
      scores: reportData.scores,
      confidence_explanation: reportData.confidenceExplanation,
      company_snapshot: reportData.companySnapshot,
      metrics: reportData.metrics,
      pros: reportData.pros,
      cons: reportData.cons,
      why_not_invest: reportData.whyNotInvest,
      competitors: reportData.competitors,
      execution_time: reportData.executionTime,
      reasoning: reportData.reasoning,
      created_at: new Date().toISOString()
    };
    db.reports.push(newReport);
    writeJsonDb(db);
    return newReport;
  }
}

/**
 * Fetches history of reports (metadata only)
 * @returns {Promise<Array>} List of report summaries
 */
export async function getHistory() {
  if (usePostgres && pool) {
    const query = `
      SELECT id, company_name, ticker, recommendation, confidence, created_at
      FROM reports
      ORDER BY created_at DESC
    `;
    const dbResult = await pool.query(query);
    return dbResult.rows;
  } else {
    // JSON Fallback
    const db = readJsonDb();
    const history = db.reports.map(r => ({
      id: r.id,
      company_name: r.company_name,
      ticker: r.ticker,
      recommendation: r.recommendation,
      confidence: r.confidence,
      created_at: r.created_at
    }));
    return history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

/**
 * Fetches a single full report by ID
 * @param {number|string} id 
 * @returns {Promise<object|null>} Full report details
 */
export async function getReportById(id) {
  if (usePostgres && pool) {
    const query = 'SELECT * FROM reports WHERE id = $1';
    const dbResult = await pool.query(query, [id]);
    return dbResult.rows[0] || null;
  } else {
    // JSON Fallback
    const db = readJsonDb();
    const report = db.reports.find(r => r.id === parseInt(id));
    return report || null;
  }
}

export { pool };
export default pool;
