// functions/api/chat.js - 详细调试版
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
        // ---- 1. 读取并清洗请求体 ----
        const rawText = await context.request.text();
        const cleaned = rawText
            .replace(/^\uFEFF/, '')
            .replace(/[\u200B-\u200D\u2060]/g, '')
            .trim();

        if (!cleaned) {
            return new Response(JSON.stringify({ 
                error: '请求体为空',
                step: 'parse_body'
            }), {
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
                preview: cleaned.substring(0, 100),
                step: 'parse_json'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!parsed.messages || !Array.isArray(parsed.messages)) {
            return new Response(JSON.stringify({
                error: '缺少 messages 字段或格式不正确',
                step: 'validate_messages'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ---- 2. 检查环境变量 ----
        const apiKey = context.env.NVIDIA_API_KEY;
        
        // 调试信息：检查 Key 是否存在
        if (!apiKey) {
            return new Response(JSON.stringify({
                error: 'API Key 未在环境变量中设置',
                step: 'env_key_missing',
                env_keys: Object.keys(context.env || {})  // 列出所有已设置的变量名
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 检查 Key 格式（不暴露完整 Key）
        const keyPreview = apiKey.substring(0, 10) + '...';
        if (!apiKey.startsWith('nvapi-')) {
            return new Response(JSON.stringify({
                error: 'API Key 格式可能不正确（应以 nvapi- 开头）',
                preview: keyPreview,
                step: 'key_format'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ---- 3. 调用 NVIDIA API ----
        try {
            const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
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
                    error: `NVIDIA API 错误 (${response.status})`,
                    detail: data.error?.message || JSON.stringify(data),
                    step: 'nvidia_api_error'
                }), {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (fetchErr) {
            return new Response(JSON.stringify({
                error: `调用 NVIDIA API 失败: ${fetchErr.message}`,
                step: 'nvidia_fetch_error'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (err) {
        return new Response(JSON.stringify({
            error: `服务器内部错误: ${err.message}`,
            step: 'server_error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
