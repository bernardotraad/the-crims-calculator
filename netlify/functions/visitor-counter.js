import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function ensureTablesExist() {
    await sql`
    CREATE TABLE IF NOT EXISTS daily_uniques_hll (
      day DATE PRIMARY KEY,
      visitors HLL
    );
  `;
    await sql`
    CREATE TABLE IF NOT EXISTS recent_visits (
      visitor_hash TEXT PRIMARY KEY,
      last_seen TIMESTAMPTZ NOT NULL
    );
  `;
}

export default async (req) => {
    try {
        await ensureTablesExist();

        const visitorIp = req.headers['x-nf-client-connection-ip'] || 'unknown';
        const visitorHash = `user-${visitorIp}`;
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Online counter
        await sql`
      INSERT INTO recent_visits (visitor_hash, last_seen)
      VALUES (${visitorHash}, ${now})
      ON CONFLICT (visitor_hash)
      DO UPDATE SET last_seen = ${now};
    `;
        await sql`DELETE FROM recent_visits WHERE last_seen < NOW() - INTERVAL '5 minutes'`;
        const onlineResult = await sql`SELECT COUNT(*) FROM recent_visits`;
        const onlineCount = onlineResult[0].count;

        // 24h counter with HLL
        await sql`
      INSERT INTO daily_uniques_hll (day, visitors)
      VALUES (${today}, hll_empty())
      ON CONFLICT (day) DO NOTHING;
    `;
        await sql`
      UPDATE daily_uniques_hll
      SET visitors = hll_add(visitors, hll_hash_text(${visitorHash}))
      WHERE day = ${today};
    `;
        await sql`DELETE FROM daily_uniques_hll WHERE day < NOW() - INTERVAL '1 day'`;
        const dailyResult = await sql`
      SELECT hll_cardinality(hll_union_agg(visitors)) as count
      FROM daily_uniques_hll
      WHERE day >= NOW() - INTERVAL '1 day';
    `;
        const dailyCount = dailyResult[0].count;

        return new Response(JSON.stringify({
            online: parseInt(onlineCount, 10),
            last24h: parseInt(dailyCount, 10),
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error('Database Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};