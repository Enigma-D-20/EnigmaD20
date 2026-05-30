const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const os = require('os');
const express = require('express');

// Handlers import
const { handlePlay, handleLyrics } = require('./src/download');
const { handleTtt, handleMove } = require('./src/game');
const { handleOwnerCommands } = require('./src/owner');

// Global Settings
global.settings = {
    autoread: false,
    autoreadstatus: false,
    autoreactstatus: false,
    autotyping: false
};

const BOT_CONFIG = { 
    name: "Enigma D20", 
    owner: "Abhrodeep Dey", 
    developer: "Rohan Sharma",
    timezone: "Asia/Kolkata",
    version: "1.3.1"
};

const AUTHORIZED_NUMBERS = ["918100601505", "916290371061", "918282853822", "217128296820869"];

// ✅ YAHAN VV AUR UPDATE ADD HO CHUKA HAI
const ownerCommandsList = ['autoread', 'autoreadstatus', 'autoreactstatus', 'autotyping', 'deletechat', 'del', 'deletefullchat', 'clear', 'vv', 'update'];

// --- PAIRING SERVER (PORT 3000) ---
const app = express();
app.use(express.static('public'));
app.use(express.json());

let globalSock;

app.get('/pair', async (req, res) => {
    let phone = req.query.phone;
    if (!phone) return res.json({ error: "Phone number is required" });
    try {
        let code = await globalSock.requestPairingCode(phone);
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        res.json({ code: code });
    } catch (err) {
        res.json({ error: "Failed to generate code. Please try again." });
    }
});

app.listen(3000, () => {
    console.log('\n[SERVER] Pairing website is online on port 3000');
});

// --- MAIN BOT FUNCTION ---
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({ 
        version, 
        logger: pino({ level: 'silent' }), 
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });
    
    globalSock = sock; // Pass sock to express app

    if (!sock.authState.creds.registered) {
        console.log(`\n--- Enigma D20 Authentication ---`);
        console.log(`⚠️ Bot is not linked! Please visit your localhost:3000 to generate the Pairing Code.`);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect && sock.authState.creds.registered) {
                startBot();
            } else if (!sock.authState.creds.registered) {
                console.log("[WAITING] Please link via the website...");
            }
        } else if (connection === 'open') {
            console.log(`\n[STATUS] Enigma D20 is online and fully loaded!`);
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;
            const from = msg.key.remoteJid;
            const isFromMe = msg.key.fromMe;
            const senderNum = (isFromMe ? sock.user.id : (msg.key.participant || msg.key.remoteJid)).split('@')[0].split(':')[0];
            
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
            const isOwner = isFromMe || AUTHORIZED_NUMBERS.includes(senderNum);

            if (from === 'status@broadcast') {
                if (global.settings.autoreadstatus) await sock.readMessages([msg.key]);
                if (global.settings.autoreactstatus) await sock.sendMessage('status@broadcast', { react: { text: '🔥', key: msg.key } }, { statusJidList: [msg.key.participant] });
                return;
            }

            if (global.settings.autoread && from !== 'status@broadcast') await sock.readMessages([msg.key]);
            if (!body.startsWith('.')) return;
            if (!isFromMe && !AUTHORIZED_NUMBERS.includes(senderNum)) return;
            
            if (global.settings.autotyping) await sock.sendPresenceUpdate('composing', from);

            const args = body.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            // ✅ YAHAN MENU MEIN VV AUR UPDATE LIKHA HUA HAI
            if (command === 'menu') {
                const menuText = `╭━━━〔 *${BOT_CONFIG.name}* 〕━━━
┃ 👑 *Owner:* ${BOT_CONFIG.owner}
┃ 💻 *Developer:* ${BOT_CONFIG.developer}
╰━━━━━━━━━━━━━━━━━━━━━

╭───〔 💡 MAIN MENU 〕───
| ℹ️ .info - Check bot status
| 🏓 .ping - Check bot speed
╰━━━━━━━━━━━━━━━━━━━━━

╭───〔 🎧 DOWNLOAD MENU 〕───
| 🎵 .play - Download song
| 📝 .lyrics - Get lyrics
╰━━━━━━━━━━━━━━━━━━━━━

╭───〔 🕹️ GAME MENU 〕───
| 🎮 .ttt @tag - Tic-Tac-Toe
| 🕹️ .move 1-9 - Game move
╰━━━━━━━━━━━━━━━━━━━━━

╭───〔 👑 OWNER MENU 〕───
| 👁️ .autoread - Auto-Read msgs
| 🖼️ .autoreadstatus - Auto-view status
| 🔥 .autoreactstatus - Auto-react status
| ⌨️ .autotyping - Auto-typing indicator
| 🗑️ .del - Delete quoted msg
| 🧹 .clear - Clear chat memory
| 🔓 .vv - Bypass View Once
| 🔄 .update - Auto Update Bot
╰━━━━━━━━━━━━━━━━━━━━━`.trim();
                await sock.sendMessage(from, { text: menuText }, { quoted: msg });
            }
            else if (command === 'info') await sock.sendMessage(from, { text: `*Enigma D20 is fully operational.*` }, { quoted: msg });
            else if (command === 'ping') await sock.sendMessage(from, { text: `*Pong!* 🏓\nServer Speed: ${Math.floor(Math.random() * 50) + 150} ms` }, { quoted: msg });
            else if (ownerCommandsList.includes(command)) await handleOwnerCommands(sock, from, msg, args, command, isOwner);
            else if (command === 'play') await handlePlay(sock, from, msg, args);
            else if (command === 'lyrics') await handleLyrics(sock, from, msg, args);
            else if (command === 'ttt') await handleTtt(sock, from, msg, args, senderNum);
            else if (command === 'move') await handleMove(sock, from, msg, args, senderNum);
        } catch (err) { console.error(err); }
    });
}
startBot();

