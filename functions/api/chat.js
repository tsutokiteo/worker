// functions/api/chat.js - 终极清洗版
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
        // ---- 1. 读取原始文本 ----
        const rawText = await context.request.text();

        // ---- 2. 强制清洗：只保留可打印字符 ----
        // 移除所有控制字符（ASCII 0-31 和 127-159），保留换行符和制表符
        let cleaned = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
        // 移除 BOM
        cleaned = cleaned.replace(/^\uFEFF/, '');
        // 移除零宽字符
        cleaned = cleaned.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
        // 去除首尾空白
        cleaned = cleaned.trim();

        // ---- 3. 如果清洗后为空 ----
        if (!cleaned || cleaned === '{}') {
            return new Response(JSON.stringify({
                error: '请求体为空或只有空白字符',
                raw_length: rawText.length,
                cleaned_length: cleaned.length
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ---- 4. 尝试解析 JSON ----
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (parseErr) {
            // 返回详细的调试信息
            return new Response(JSON.stringify({
                error: `JSON 解析失败: ${parseErr.message}`,
                position: parseErr.message.match(/position (\d+)/)?.[1] || '未知',
                preview: cleaned.substring(0, 200),
                char_codes: cleaned.substring(0, 20).split('').map(c => c.charCodeAt(0))
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ---- 5. 验证 messages ----
        if (!parsed.messages || !Array.isArray(parsed.messages)) {
            return new Response(JSON.stringify({
                error: '缺少 messages 字段或格式不正确'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ---- 6. 读取 API Key ----
        const apiKey = context.env.NVIDIA_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({
                error: 'API Key 未设置',
                env_keys: Object.keys(context.env || {})
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ---- 7. 调用 NVIDIA API ----
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
                error: `NVIDIA 错误 (${response.status})`,
                detail: data.error?.message || JSON.stringify(data)
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
