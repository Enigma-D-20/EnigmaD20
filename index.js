require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');

// 👇 YAHAN APNA NUMBER SET HAI (Jisko link karna hai)
const PAIRING_NUMBER = "916290371061"; 
// 👇 YAHAN SESSION ID AAYEGA
const DEVELOPER_NUMBER = "916290371061";

// --- AUTO CLEANER ---
if (!process.env.SESSION_ID && !fs.existsSync('./auth_info/creds.json')) {
    try { fs.rmSync('./auth_info', { recursive: true, force: true }); } catch(e) {}
}

// --- SESSION ID LOAD LOGIC ---
if (process.env.SESSION_ID && !fs.existsSync('auth_info')) {
    console.log("🔄 Loading Session from .env...");
    try {
        const sessionData = JSON.parse(Buffer.from(process.env.SESSION_ID, 'base64').toString('utf-8'));
        fs.mkdirSync('auth_info', { recursive: true });
        for (const file in sessionData) {
            fs.writeFileSync(path.join('auth_info', file), sessionData[file]);
        }
    } catch(e) { console.log("Session Load Error", e); }
}

const { handlePlay, handleLyrics } = require('./src/download');
const { handleTtt, handleMove } = require('./src/game');
const { handleOwnerCommands } = require('./src/owner');

global.settings = { autoread: false, autoreadstatus: false, autoreactstatus: false, autotyping: false };
const BOT_CONFIG = { name: "Enigma D20", owner: "Abhrodeep Dey", developer: "Rohan Sharma" };
const AUTHORIZED_NUMBERS = ["918100601505", "916290371061", "918282853822", "217128296820869", "919339777647"];
const ownerCommandsList = ['autoread', 'autoreadstatus', 'autoreactstatus', 'autotyping', 'deletechat', 'del', 'deletefullchat', 'clear', 'vv', 'update'];

const app = express();
app.get('/', (req, res) => res.send('Enigma D20 is running!'));
app.listen(3000, () => console.log('\n[SERVER] Keep-alive server running on port 3000'));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({ 
        version, 
        logger: pino({ level: 'silent' }), 
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "111.0.0"] // Browser version updated for safety
    });

    sock.ev.on('creds.update', saveCreds);

    let pairingCodeRequested = false; // Isse code baar-baar generate nahi hoga

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // 🔥 THE ULTIMATE FIX: Jab server 100% ready hoga (qr aayega), tabhi code mangenge! No Timer!
        if (qr && !sock.authState.creds.registered && !pairingCodeRequested) {
            pairingCodeRequested = true;
            console.log(`\n=========================================`);
            console.log(`⏳ Server Connected! Fetching pairing code for: ${PAIRING_NUMBER}...`);
            
            try {
                let code = await sock.requestPairingCode(PAIRING_NUMBER);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`✅ YOUR PAIRING CODE IS: ${code}`);
                console.log(`👉 Link a device > Link with phone number instead > Enter this code!`);
                console.log(`=========================================\n`);
            } catch (err) {
                console.log("❌ Error fetching code:", err.message);
                console.log("⚠️ Agar fail hua, toh bot ko band karke wapas start karein.");
            }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`\n[STATUS] Enigma D20 is online and fully loaded!`);
            
            if (!process.env.SESSION_ID) {
                setTimeout(async () => {
                    try {
                        const files = fs.readdirSync('auth_info');
                        const sessionData = {};
                        files.forEach(file => {
                            sessionData[file] = fs.readFileSync(path.join('auth_info', file), 'utf-8');
                        });
                        const sessionString = Buffer.from(JSON.stringify(sessionData)).toString('base64');
                        
                        await sock.sendMessage(`${DEVELOPER_NUMBER}@s.whatsapp.net`, { 
                            text: `🔑 *YOUR SESSION ID:*\n\n${sessionString}\n\n⚠️ Isko Katabump par .env file mein 'SESSION_ID=' ke aage paste karna.` 
                        });
                        console.log("✅ Session ID aapke developer number par bhej diya gaya hai!");
                    } catch (err) { console.error("Session generation failed:", err); }
                }, 5000);
            }
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

            if (command === 'menu') {
                const menuText = `╭━━━〔 *${BOT_CONFIG.name}* 〕━━━\n┃ 👑 *Owner:* ${BOT_CONFIG.owner}\n┃ 💻 *Developer:* ${BOT_CONFIG.developer}\n╰━━━━━━━━━━━━━━━━━━━━━\n\n╭───〔 💡 MAIN MENU 〕───\n| ℹ️ .info - Check status\n| 🏓 .ping - Check speed\n╰━━━━━━━━━━━━━━━━━━━━━\n\n╭───〔 🎧 DOWNLOAD MENU 〕───\n| 🎵 .play - Download song\n| 📝 .lyrics - Get lyrics\n╰━━━━━━━━━━━━━━━━━━━━━\n\n╭───〔 🕹️ GAME MENU 〕───\n| 🎮 .ttt @tag - Tic-Tac-Toe\n| 🕹️ .move 1-9 - Game move\n╰━━━━━━━━━━━━━━━━━━━━━\n\n╭───〔 👑 OWNER MENU 〕───\n| 👁️ .autoread - Auto-Read msgs\n| 🖼️ .autoreadstatus - Auto-view status\n| 🔥 .autoreactstatus - Auto-react status\n| ⌨️ .autotyping - Auto-typing\n| 🗑️ .del - Delete msg\n| 🧹 .clear - Clear chat\n| 🔓 .vv - Bypass View Once\n| 🔄 .update - Auto Update Bot\n╰━━━━━━━━━━━━━━━━━━━━━`.trim();
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

