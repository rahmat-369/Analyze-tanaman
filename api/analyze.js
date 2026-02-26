export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });

    try {
        const { image, mime, plantName } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("API Key belum diset di Vercel!");
        if (!image) throw new Error("Data gambar tidak ditemukan!");

        // URL API Gemini 1.5 Flash (Mendukung Grounding)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        let promptText = "Tolong analisis gambar daun tanaman ini secara mendalam.";
        if (plantName && plantName.trim() !== "") {
            promptText += `\nIdentitas tanaman: ${plantName}. Cari referensi dari web terpercaya mengenai gejala pada tanaman ini.`;
        }
        promptText += "\nBerikan diagnosa akurat dan solusi pengobatan yang valid berdasarkan data terbaru di internet.";

        const payload = {
            system_instruction: {
                parts: [{ 
                    text: "Kamu adalah Pakar Botani AI Terpercaya. Tugasmu memberikan diagnosa yang didasarkan pada fakta riil dari internet. Wajib menyertakan sumber jika ada. Format: **Nama Tanaman**, **Diagnosa Penyakit**, dan **Solusi Pengobatan** (kimia/organik)." 
                }]
            },
            contents: [{
                role: "user",
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: mime || "image/jpeg", data: image } }
                ]
            }],
            tools: [{
                google_search_retrieval: {} // INI FITUR PENCARIAN AGAR TIDAK HALU
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 } // Temperature rendah agar lebih fokus pada data asli
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Google API Error");

        const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak menemukan referensi yang cukup.";
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
    }
