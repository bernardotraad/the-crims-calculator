const { Client } = require('pg');

// Database connection configuration
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database connection
let isConnected = false;

async function connectDB() {
    if (!isConnected) {
        try {
            await client.connect();
            isConnected = true;
            
            // Create tables if they don't exist
            await client.query(`
                CREATE TABLE IF NOT EXISTS visitor_stats (
                    id SERIAL PRIMARY KEY,
                    date DATE DEFAULT CURRENT_DATE,
                    daily_count INTEGER DEFAULT 0,
                    online_count INTEGER DEFAULT 0,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            
            await client.query(`
                CREATE TABLE IF NOT EXISTS active_sessions (
                    session_id TEXT PRIMARY KEY,
                    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
        } catch (error) {
            console.error('Database connection error:', error);
            throw error;
        }
    }
}

async function updateVisitorStats() {
    await connectDB();
    
    const today = new Date().toISOString().split('T')[0];
    const sessionId = Math.random().toString(36).substring(2, 15);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    try {
        // Clean up old sessions (older than 5 minutes)
        await client.query('DELETE FROM active_sessions WHERE last_seen < $1', [fiveMinutesAgo]);
        
        // Add/update current session
        await client.query(`
            INSERT INTO active_sessions (session_id, last_seen) 
            VALUES ($1, CURRENT_TIMESTAMP)
            ON CONFLICT (session_id) DO UPDATE SET last_seen = CURRENT_TIMESTAMP
        `, [sessionId]);
        
        // Get current online count
        const onlineResult = await client.query('SELECT COUNT(*) as count FROM active_sessions');
        const onlineCount = parseInt(onlineResult.rows[0].count);
        
        // Update or insert today's stats
        await client.query(`
            INSERT INTO visitor_stats (date, daily_count, online_count, last_updated)
            VALUES ($1, 1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (date) DO UPDATE SET
                daily_count = visitor_stats.daily_count + 1,
                online_count = $2,
                last_updated = CURRENT_TIMESTAMP
        `, [today, onlineCount]);
        
        // Get updated daily count
        const dailyResult = await client.query('SELECT daily_count FROM visitor_stats WHERE date = $1', [today]);
        const dailyCount = dailyResult.rows[0]?.daily_count || 0;
        
        return {
            online: onlineCount,
            daily: dailyCount
        };
    } catch (error) {
        console.error('Error updating visitor stats:', error);
        throw error;
    }
}

async function getVisitorStats() {
    await connectDB();
    
    const today = new Date().toISOString().split('T')[0];
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    try {
        // Clean up old sessions
        await client.query('DELETE FROM active_sessions WHERE last_seen < $1', [fiveMinutesAgo]);
        
        // Get current stats
        const [onlineResult, dailyResult] = await Promise.all([
            client.query('SELECT COUNT(*) as count FROM active_sessions'),
            client.query('SELECT daily_count FROM visitor_stats WHERE date = $1', [today])
        ]);
        
        const onlineCount = parseInt(onlineResult.rows[0].count);
        const dailyCount = dailyResult.rows[0]?.daily_count || 0;
        
        return {
            online: onlineCount,
            daily: dailyCount
        };
    } catch (error) {
        console.error('Error getting visitor stats:', error);
        throw error;
    }
}

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        let stats;
        
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            if (body.action === 'increment') {
                stats = await updateVisitorStats();
            } else {
                stats = await getVisitorStats();
            }
        } else {
            stats = await getVisitorStats();
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(stats)
        };
    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                online: 0,
                daily: 0
            })
        };
    }
};