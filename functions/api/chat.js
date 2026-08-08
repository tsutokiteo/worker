// functions/api/chat.js
export async function onRequest(context) {
    // 只处理 POST
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        // 读取请求体
        const { messages } = await context.request.json();

        // 从环境变量读取 Key（在 Pages 项目中设置）
        const apiKey = context.env.NVIDIA_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API Key 未设置' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 调用 NVIDIA API
        const response = await fetch('https://integrate.api.nvidia.com/v1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'nvidia/nemotron-3-super-120b-a12b',
                messages: messages,
                stream: false
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify({
                error: `NVIDIA 错误 (${response.status}): ${data.error?.message || JSON.stringify(data)}`
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({
            error: `服务器错误: ${err.message}`
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
