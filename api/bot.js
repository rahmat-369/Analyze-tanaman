import { createClient } from '@supabase/supabase-js';

// Mengambil kunci rahasia dari Vercel Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.MY_CHAT_ID;

// Inisialisasi koneksi ke Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Hanya menerima method POST dari Webhook Telegram
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { message } = req.body;
        
        // Abaikan jika bukan pesan teks
        if (!message || !message.text) return res.status(200).send('ok');

        const chatId = message.chat.id.toString();
        const text = message.text;

        // FILTER KEAMANAN: Pastikan yang kirim pesan hanya Anda (MY_CHAT_ID)
        if (chatId !== adminChatId) {
            return res.status(200).send('Unauthorized');
        }

        // --- PERINTAH 1: UPDATE PESAN NOTIFIKASI ---
        if (text.startsWith('/update ')) {
            const newMessage = text.replace('/update ', '').trim();
            
            const { error } = await supabase
                .from('web_config')
                .update({ admin_message: newMessage })
                .eq('id', 1);

            if (error) throw error;
            await sendTelegramMsg(chatId, "✅ *Berhasil!*\nPesan notifikasi Flora.AI telah diperbarui. Silakan cek website Anda.");
        }

        // --- PERINTAH 2: AKTIFKAN MAINTENANCE MODE ---
        else if (text === '/maintenance on') {
            const { error } = await supabase
                .from('web_config')
                .update({ is_maintenance: true })
                .eq('id', 1);

            if (error) throw error;
            await sendTelegramMsg(chatId, "🚧 *Mode Perbaikan DIAKTIFKAN.*\nPengguna saat ini akan tertahan di halaman Welcome.");
        }

        // --- PERINTAH 3: MATIKAN MAINTENANCE MODE ---
        else if (text === '/maintenance off') {
            const { error } = await supabase
                .from('web_config')
                .update({ is_maintenance: false })
                .eq('id', 1);

            if (error) throw error;
            await sendTelegramMsg(chatId, "✅ *Mode Perbaikan DIMATIKAN.*\nWebsite Flora.AI kembali berjalan normal.");
        }
        
        // --- PERINTAH 4: MENU BANTUAN ---
        else if (text === '/start' || text === '/help') {
            const helpMsg = `🤖 *Flora.AI Admin Bot*\n\nPerintah yang tersedia:\n1. \`/update [pesan]\` - Mengganti teks notifikasi lonceng.\n2. \`/update \` (pakai spasi kosong) - Menghapus notifikasi lonceng.\n3. \`/maintenance on\` - Mengunci website.\n4. \`/maintenance off\` - Membuka website.`;
            await sendTelegramMsg(chatId, helpMsg);
        }

        return res.status(200).send('ok');
        
    } catch (error) {
        console.error(error);
        if (req.body?.message?.chat?.id) {
            await sendTelegramMsg(req.body.message.chat.id, "❌ *Gagal mengeksekusi:* \n" + error.message);
        }
        return res.status(500).send('Error');
    }
}

// Fungsi internal untuk membalas chat ke Telegram Anda
async function sendTelegramMsg(chatId, text) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        })
    });
        } 
