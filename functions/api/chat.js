// functions/api/chat.js - 极简测试（不解析 JSON）
export async function onRequest(context) {
    // 直接返回固定内容，不做任何解析
    return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'Functions 已生效' 
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
