// functions/api/chat.js - 正式版（调用 NVIDIA）
export async function onRequest(context) {
    // 处理 OPTIONS
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

    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        // 读取并清洗请求体
        const rawText = await context.request.text();
        const cleaned = rawText
            .replace(/^\uFEFF/, '')
            .replace(/[\u200B-\u200D\u2060]/g, '')
            .trim();

        if (!cleaned) {
            return new Response(JSON.stringify({ error: '请求体为空' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            return new Response(JSON.stringify({
                error: `JSON 解析失败: ${parseErr.message}`,
                preview: cleaned.substring(0, 100)
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!parsed.messages || !Array.isArray(parsed.messages)) {
            return new Response(JSON.stringify({
                error: '缺少 messages 字段或格式不正确'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 读取 API Key（需要在 Pages 设置中添加）
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
                messages: parsed.messages,
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
