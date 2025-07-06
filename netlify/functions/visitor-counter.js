// Arquivo: netlify/functions/visitor-counter.js

import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function ensureTablesExist() {
    await sql`
        CREATE TABLE IF NOT EXISTS daily_uniques_hll ( day DATE PRIMARY KEY, visitors HLL );
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS recent_visits ( visitor_hash TEXT PRIMARY KEY, last_seen TIMESTAMPTZ NOT NULL );
    `;
}

// O manipulador principal da função Netlify.
export default async (req) => {
    try {
        await ensureTablesExist();

        // Tenta pegar o ID enviado pelo cliente via POST.
        let visitorId;
        if (req.body) {
            try {
                const body = JSON.parse(req.body);
                visitorId = body.visitorId;
            } catch (e) {
                // Corpo da requisição não é um JSON válido, ignora.
            }
        }

        // Se o ID do cliente não foi enviado, usa o IP como fallback.
        const ip = req.headers['x-nf-client-connection-ip'] || 'unknown';
        const visitorHash = visitorId || `user-${ip}`; // Prioriza o ID do cliente!

        console.log('Identificador Utilizado:', visitorHash); // Log para depuração

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // --- LÓGICA DO CONTADOR "ONLINE" ---
        await sql`
            INSERT INTO recent_visits (visitor_hash, last_seen)
            VALUES (${visitorHash}, ${now})
            ON CONFLICT (visitor_hash)
            DO UPDATE SET last_seen = ${now};
        `;
        await sql`DELETE FROM recent_visits WHERE last_seen < NOW() - INTERVAL '5 minutes'`;
        const onlineResult = await sql`SELECT COUNT(*) FROM recent_visits`;
        const onlineCount = onlineResult[0].count;

        // --- LÓGICA DO CONTADOR "24h" ---
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

        // --- Retorna os resultados em formato JSON (com header de cache) ---
        return new Response(JSON.stringify({
            online: parseInt(onlineCount, 10),
            last24h: parseInt(dailyCount, 10),
        }), {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });

    } catch (error) {
        console.error('Database Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};