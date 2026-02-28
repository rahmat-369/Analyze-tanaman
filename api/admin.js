export default async function handler(req, res) {
    // Pengaturan CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Pastikan hanya menerima POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan method POST' });

    try {
        const { action, password, is_maintenance, maintenance_reason, notification } = req.body;
        
        // Mengambil password dari Environment Variables Vercel
        const validPassword = process.env.ADMIN_PASSWORD;

        // Validasi jika ADMIN_PASSWORD belum dibuat di Vercel
        if (!validPassword) {
            return res.status(500).json({ error: "Variabel ADMIN_PASSWORD belum diset di Vercel!" });
        }

        // Cek kecocokan password
        if (password !== validPassword) {
            return res.status(401).json({ error: "Password Admin Salah!" });
        }

        // INISIALISASI MEMORI GLOBAL (Pengganti Database sementara)
        if (!global.systemState) {
            global.systemState = {
                is_maintenance: false,
                maintenance_reason: "",
                notification: ""
            };
        }

        // Logika berdasarkan aksi dari frontend admin
        if (action === 'login') {
            // Mengembalikan status saat ini agar switch & form otomatis terisi
            return res.status(200).json(global.systemState);
        } 
        else if (action === 'set_maintenance') {
            global.systemState.is_maintenance = is_maintenance;
            global.systemState.maintenance_reason = maintenance_reason || "";
            return res.status(200).json({ success: true, state: global.systemState });
        }
        else if (action === 'set_notification') {
            global.systemState.notification = notification || "";
            return res.status(200).json({ success: true, state: global.systemState });
        }
        else {
            return res.status(400).json({ error: "Action tidak dikenali" });
        }

    } catch (error) {
        return res.status(500).json({ error: "Server Error", detail: error.message });
    }
        } 
