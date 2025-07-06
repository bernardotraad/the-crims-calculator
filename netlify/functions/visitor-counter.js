import postgres from 'postgres';

// A URL do seu banco de dados Neon ser� lida automaticamente da vari�vel de ambiente
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

// Fun��o para criar a tabela de visitas se ela ainda n�o existir
async function ensureTableExists() {
    await sql`
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL
    );
  `;
}

export default async (req) => {
    try {
        // Garante que a tabela existe antes de fazer qualquer coisa
        await ensureTableExists();

        const now = new Date();

        // 1. Insere o timestamp da visita atual
        await sql`INSERT INTO visits (timestamp) VALUES (${now})`;

        // 2. Apaga registros com mais de 24 horas para manter o banco limpo
        await sql`DELETE FROM visits WHERE timestamp < NOW() - INTERVAL '24 hours'`;

        // 3. Conta os visitantes nos �ltimos 5 minutos (online)
        const onlineResult = await sql`
      SELECT COUNT(*) FROM visits WHERE timestamp > NOW() - INTERVAL '5 minutes'
    `;
        const onlineCount = onlineResult[0].count;

        // 4. Conta o total de visitas (que ser�o as das �ltimas 24h)
        const dailyResult = await sql`SELECT COUNT(*) FROM visits`;
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