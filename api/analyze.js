export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Sila gunakan kaedah POST' });

    try {
        const { image, mime, plantName } = req.body;
        
        // Membaca senarai API Key dari Environment Variable
        const keys = [];
        if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
        if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
        if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);

        if (keys.length === 0) throw new Error("Tiada API Key yang ditetapkan di Vercel!");
        if (!image) throw new Error("Data gambar tidak ditemui!");

        let promptText = "Tolong analisis gambar bahagian tanaman ini (boleh berupa daun, batang, kulit kayu, atau akar) secara mendalam untuk mengesan penyakit, perosak, atau pereputan.";
        if (plantName && plantName.trim() !== "") {
            promptText += `\nTanaman ini dikenal pasti oleh pengguna sebagai: ${plantName}. Tolong fokuskan analisis pada penyakit yang sering menyerang tanaman ini berdasarkan pemerhatian visual.`;
        }

        const payload = {
            system_instruction: {
                parts: [{ 
                    text: "Kamu adalah Pakar Botani AI. Analisis gambar tanaman yang diberikan (daun, batang, atau akar). Berikan diagnosis profesional dalam Bahasa Melayu/Indonesia. Format wajib:\n**Nama Tanaman**\n**Diagnosis Penyakit**\n**Penyelesaian & Rawatan**\n\nJawab dengan perenggan yang kemas dan mudah dibaca. Di bahagian PALING AKHIR jawapanmu, buat baris baru dengan tulisan tepat '---REFERENSI---', lalu di bawahnya berikan 2-3 pautan URL sah berkaitan penyakit tersebut dalam format Markdown standard seperti ini: [Nama Web](https://url-web.com)." 
                }]
            },
            contents: [{
                role: "user",
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: mime || "image/jpeg", data: image } }
                ]
            }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
        };

        let lastError = null;
        let responseData = null;
        let isSuccess = false;

        // SISTEM ROTASI API KEY (Auto-Failover)
        for (let i = 0; i < keys.length; i++) {
            const currentKey = keys[i];
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    // Jika ralat disebabkan kuota habis (Status 429), tukar ke kunci seterusnya
                    if (response.status === 429) {
                        lastError = `Kuota Key ${i + 1} Habis.`;
                        continue; 
                    } else {
                        throw new Error(data.error?.message || "Google API Error");
                    }
                }

                responseData = data;
                isSuccess = true;
                break; // Keluar dari gelung jika berjaya
            } catch (err) {
                lastError = err.message;
            }
        }

        if (!isSuccess) {
            return res.status(500).json({ error: "Semua API Key kehabisan kuota atau gagal berfungsi", detail: lastError });
        }

        const analysis = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "AI tidak memberikan maklum balas.";
        return res.status(200).json({ analysis });

    } catch (error) {
        return res.status(500).json({ error: "Ralat Pelayan", detail: error.message });
    }
    }
