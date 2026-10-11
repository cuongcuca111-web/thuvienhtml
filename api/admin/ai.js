import { getAdminDb, verifyAdminSession } from '../../lib/firebase-admin.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Chưa đăng nhập' });
        }

        const isAuthed = await verifyAdminSession(token);
        if (!isAuthed) {
            return res.status(403).json({ error: 'Không có quyền quản trị viên' });
        }

        const { action } = req.body;
        const db = getAdminDb();

        if (action === 'get') {
            const doc = await db.collection('config').doc('ai_settings').get();
            const data = doc.exists ? doc.data() : {};
            return res.status(200).json({
                hasKey: !!data.apiKey,
                keyLastChars: data.apiKey ? data.apiKey.slice(-4) : '',
                provider: data.provider || 'gemini',
                modelFast: data.modelFast || 'gemini-1.5-flash',
                modelDeep: data.modelDeep || 'gemini-1.5-pro',
                temperature: data.temperature ?? 0.7,
                maxTokens: data.maxTokens ?? 2048,
                systemPrompt: data.systemPrompt || '',
                safetySettings: data.safetySettings || 'default'
            });
        }

        if (action === 'save') {
            const { apiKey, provider, modelFast, modelDeep, temperature, maxTokens, systemPrompt, safetySettings } = req.body;
            const updateData = {
                provider: provider || 'gemini',
                modelFast: modelFast || 'gemini-1.5-flash',
                modelDeep: modelDeep || 'gemini-1.5-pro',
                temperature: Number(temperature) || 0.7,
                maxTokens: Number(maxTokens) || 2048,
                systemPrompt: systemPrompt || '',
                safetySettings: safetySettings || 'default',
                updatedAt: new Date().toISOString()
            };
            if (apiKey && apiKey.trim()) {
                updateData.apiKey = apiKey.trim();
            }
            await db.collection('config').doc('ai_settings').set(updateData, { merge: true });
            return res.status(200).json({ success: true, message: 'Đã lưu cấu hình AI thành công!' });
        }

        if (action === 'test') {
            const doc = await db.collection('config').doc('ai_settings').get();
            const data = doc.exists ? doc.data() : {};
            const keyToTest = (req.body.apiKey && req.body.apiKey.trim()) ? req.body.apiKey.trim() : data.apiKey;

            if (!keyToTest) {
                return res.status(400).json({ error: 'Chưa có API key để kiểm tra' });
            }

            const inputModel = req.body.model || data.modelFast || 'gemini-1.5-flash';
            const modelsToTry = [
                inputModel,
                'gemini-1.5-flash',
                'gemini-2.0-flash',
                'gemini-1.5-pro',
                'gemini-pro'
            ];
            const uniqueModels = [...new Set(modelsToTry)];
            const apiVersions = ['v1beta', 'v1'];

            let lastErrorMsg = 'Không thể kết nối';
            let lastStatus = 500;
            let successResult = null;

            for (const model of uniqueModels) {
                for (const ver of apiVersions) {
                    try {
                        const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${keyToTest}`;
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: 'Trả lời: "Kết nối AI thành công!"' }] }],
                                generationConfig: { maxOutputTokens: 30 }
                            })
                        });

                        if (response.ok) {
                            const resData = await response.json();
                            const reply = resData.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
                            successResult = { model, version: ver, reply };
                            break;
                        } else {
                            lastStatus = response.status;
                            const errData = await response.json().catch(() => ({}));
                            lastErrorMsg = errData?.error?.message || `HTTP ${response.status}`;
                        }
                    } catch (e) {
                        lastErrorMsg = e.message;
                    }
                }
                if (successResult) break;
            }

            if (successResult) {
                return res.status(200).json({
                    success: true,
                    message: `Kết nối thành công với ${successResult.model} (${successResult.version})! Phản hồi: ${successResult.reply.trim()}`
                });
            } else {
                return res.status(lastStatus).json({
                    error: `Kiểm tra thất bại: ${lastErrorMsg}`
                });
            }
        }

        return res.status(400).json({ error: 'Action không hợp lệ' });
    } catch (err) {
        console.error('AI Admin error:', err);
        return res.status(500).json({ error: 'Lỗi máy chủ: ' + err.message });
    }
}
