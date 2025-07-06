import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

// Função para criar as tabelas necessárias
async function ensureTablesExist() {
    await sql`
    -- Tabela para o contador de 24h com HyperLogLog. Terá no máximo 2 linhas.
    CREATE TABLE IF NOT EXISTS daily_uniques_hll (
      day DATE PRIMARY KEY,
      visitors HLL
    );
  `;
    await sql`
    -- Tabela pequena para o contador "online". Registros são apagados rapidamente.
    CREATE TABLE IF NOT EXISTS recent_visits (
      visitor_hash TEXT PRIMARY KEY,
      last_seen TIMESTAMPTZ NOT NULL
    );
  `;
}

export default async (req) => {
    try {
        // Garante que as tabelas existem
        await ensureTablesExist();

        const visitorIp = req.headers['x-nf-client-connection-ip'] || 'unknown';
        const visitorHash = `user-${visitorIp}`;
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // Pega a data de hoje, ex: "2025-07-05"

        // --- LÓGICA DO CONTADOR "ONLINE" (5 minutos) ---
        // Insere ou atualiza a visita mais recente do usuário.
        await sql`
      INSERT INTO recent_visits (visitor_hash, last_seen)
      VALUES (${visitorHash}, ${now})
      ON CONFLICT (visitor_hash)
      DO UPDATE SET last_seen = ${now};
    `;
        // Apaga visitas com mais de 5 minutos
        await sql`DELETE FROM recent_visits WHERE last_seen < NOW() - INTERVAL '5 minutes'`;
        // Conta quem está online
        const onlineResult = await sql`SELECT COUNT(*) FROM recent_visits`;
        const onlineCount = onlineResult[0].count;


        // --- LÓGICA DO CONTADOR "24h" com HLL ---
        // Insere um registro para o dia de hoje se ele não existir
        await sql`
      INSERT INTO daily_uniques_hll (day, visitors)
      VALUES (${today}, hll_empty())
      ON CONFLICT (day) DO NOTHING;
    `;
        // Adiciona o visitante ao contador HLL do dia
        await sql`
      UPDATE daily_uniques_hll
      SET visitors = hll_add(visitors, hll_hash_text(${visitorHash}))
      WHERE day = ${today};
    `;
        // Apaga os dados de HLL com mais de 1 dia para manter a tabela limpa
        await sql`DELETE FROM daily_uniques_hll WHERE day < NOW() - INTERVAL '1 day'`;
        // Pega os dados HLL de hoje e de ontem, une e calcula os visitantes únicos
        const dailyResult = await sql`
      SELECT hll_cardinality(hll_union_agg(visitors)) as count
      FROM daily_uniques_hll
      WHERE day >= NOW() - INTERVAL '1 day';
    `;
        const dailyCount = dailyResult[0].count;


        // --- Retorna os resultados ---
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