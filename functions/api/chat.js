// functions/api/chat.js - 带清洗和调试
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
        // ---- 关键：读取原始文本并清洗 ----
        const rawText = await context.request.text();
        
        // 移除 BOM、零宽空格、以及其他不可见字符
        const cleaned = rawText
            .replace(/^\uFEFF/, '')                    // 移除 BOM
            .replace(/[\u200B-\u200D\u2060]/g, '')    // 移除零宽字符
            .trim();                                   // 去除首尾空格

        // 如果清洗后为空，返回错误
        if (!cleaned) {
            return new Response(JSON.stringify({ error: '请求体为空' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 尝试解析 JSON
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            // 解析失败，返回调试信息
            return new Response(JSON.stringify({
                error: `JSON 解析失败: ${parseErr.message}`,
                preview: cleaned.substring(0, 100),
                length: cleaned.length
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 验证 messages
        if (!parsed.messages || !Array.isArray(parsed.messages)) {
            return new Response(JSON.stringify({
                error: '缺少 messages 字段或格式不正确'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 读取环境变量
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
