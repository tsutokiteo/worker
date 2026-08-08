// functions/api/chat.js - 逐步解析版
export async function onRequest(context) {
    // 只处理 POST
    if (context.request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        // 直接用 request.json() 解析（标准方式）
        const data = await context.request.json();
        
        return new Response(JSON.stringify({
            status: 'ok',
            received: data
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({
            error: err.message,
            stack: err.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
