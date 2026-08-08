// functions/api/chat.js - 正式完整版
export async function onRequest(context) {
    // 处理 OPTIONS 预检
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    // 只接受 POST
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        // 直接解析 JSON（测试证明这步是正常的）
        const { messages } = await context.request.json();

        // 从环境变量读取 API Key
        const apiKey = context.env.NVIDIA_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ 
                error: 'API Key 未设置，请在 Pages 环境变量中添加 NVIDIA_API_KEY' 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 调用 NVIDIA API
        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
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

        // 如果 NVIDIA 返回错误
        if (!response.ok) {
            return new Response(JSON.stringify({
                error: `NVIDIA API 错误 (${response.status})`,
                detail: data.error?.message || JSON.stringify(data)
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 成功返回
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
