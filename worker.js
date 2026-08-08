// worker.js
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const { messages } = await request.json();

      const apiKey = env.NVIDIA_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ 
          error: '❌ 服务器错误：未找到 API Key，请在 Worker 变量中设置 NVIDIA_API_KEY' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-4-340b-instruct',
          messages: messages,
          stream: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({
          error: `NVIDIA API 报错 (${response.status}): ${data.error?.message || JSON.stringify(data)}`
        }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        error: `Worker 内部错误: ${err.message}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};