/* ============================================================
   ClinAxis — Netlify Serverless Proxy para Anthropic API
   Endpoint: POST /.netlify/functions/claude  →  /api/claude
   Variable de entorno requerida: ANTHROPIC_API_KEY
   ============================================================ */

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // La API key la aporta el cliente desde su propio almacenamiento local
  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'API key no proporcionada o inválida. Configúrala en Ajustes → IA.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Request body inválido.' }),
    };
  }

  payload.model      = payload.model      || 'claude-sonnet-4-6';
  payload.max_tokens = payload.max_tokens || 1000;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();
    return {
      statusCode: upstream.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error al contactar Anthropic: ' + err.message }),
    };
  }
};
