export default async function handler(req, res) {
    // Pengaturan CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Gunakan method GET' });

    // Membaca dari Global Memory (Sama seperti admin.js)
    if (!global.systemState) {
        global.systemState = {
            is_maintenance: false,
            maintenance_reason: "",
            notification: ""
        };
    }

    // Mengembalikan status saat ini ke user (index.html)
    return res.status(200).json(global.systemState);
          } 
