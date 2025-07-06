import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

// Garante que as tabelas necess�rias para os contadores existam no banco de dados.
async function ensureTablesExist() {
    // Tabela para o contador de visitantes �nicos nas �ltimas 24h, usando a estrutura de dados HyperLogLog.
    await sql`
        CREATE TABLE IF NOT EXISTS daily_uniques_hll (
            day DATE PRIMARY KEY,
            visitors HLL
        );
    `;
    // Tabela para o contador "online", que registra a �ltima visita. Registros s�o apagados ap�s 5 minutos.
    await sql`
        CREATE TABLE IF NOT EXISTS recent_visits (
            visitor_hash TEXT PRIMARY KEY,
            last_seen TIMESTAMPTZ NOT NULL
        );
    `;
}

// O manipulador principal da fun��o Netlify.
export default async (req) => {
    try {
        // Primeiro, garante que a infraestrutura do banco de dados est� pronta.
        await ensureTablesExist();

        const visitorIp = req.headers['x-nf-client-connection-ip'] || 'unknown';
        const visitorHash = `user-${visitorIp}`; // Cria um hash simples para representar o visitante.
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // Data de hoje no formato "AAAA-MM-DD".

        // --- L�GICA DO CONTADOR "ONLINE" (�ltimos 5 minutos) ---

        // 1. Registra a visita atual do usu�rio, atualizando seu `last_seen` se ele j� estiver na tabela.
        await sql`
            INSERT INTO recent_visits (visitor_hash, last_seen)
            VALUES (${visitorHash}, ${now})
            ON CONFLICT (visitor_hash)
            DO UPDATE SET last_seen = ${now};
        `;

        // 2. Remove registros de visitas com mais de 5 minutos para manter a tabela pequena.
        await sql`DELETE FROM recent_visits WHERE last_seen < NOW() - INTERVAL '5 minutes'`;

        // 3. Conta quantos visitantes permanecem na tabela.
        const onlineResult = await sql`SELECT COUNT(*) FROM recent_visits`;
        const onlineCount = onlineResult[0].count;

        // --- L�GICA DO CONTADOR "24h" (usando HyperLogLog) ---

        // 1. Cria um novo registro HLL para o dia de hoje, se ainda n�o existir.
        await sql`
            INSERT INTO daily_uniques_hll (day, visitors)
            VALUES (${today}, hll_empty())
            ON CONFLICT (day) DO NOTHING;
        `;

        // 2. Adiciona o hash do visitante ao conjunto HLL do dia atual.
        await sql`
            UPDATE daily_uniques_hll
            SET visitors = hll_add(visitors, hll_hash_text(${visitorHash}))
            WHERE day = ${today};
        `;

        // 3. Remove dados de HLL com mais de 1 dia para manter a tabela limpa.
        await sql`DELETE FROM daily_uniques_hll WHERE day < NOW() - INTERVAL '1 day'`;

        // 4. Une os conjuntos HLL de hoje e ontem (para cobrir as �ltimas 24h) e calcula a cardinalidade (contagem de �nicos).
        const dailyResult = await sql`
            SELECT hll_cardinality(hll_union_agg(visitors)) as count
            FROM daily_uniques_hll
            WHERE day >= NOW() - INTERVAL '1 day';
        `;
        const dailyCount = dailyResult[0].count;

        // --- Retorna os resultados em formato JSON ---
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