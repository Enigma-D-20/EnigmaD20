const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const os = require('os');

// --- Modular Handlers (Imported from src folder) ---
const { handlePlay, handleLyrics } = require('./src/download');
const { handleTtt, handleMove } = require('./src/game');
const { handleOwnerCommands } = require('./src/owner');

// --- Express Web Server Setup ---
const app = express();
const port = process.env.PORT || 3000;
let sock; // Global socket for the website to access

app.use(express.static('public'));

app.get('/pair', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.send({ code: "Please enter a valid WhatsApp number." });
    
    const cleanedNumber = number.replace(/[^0-9]/g, '');
    if (!sock) return res.send({ code: "Bot is starting up, please wait..." });

    try {
        let code = await sock.requestPairingCode(cleanedNumber);
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        res.send({ code: code });
    } catch (e) {
        console.error("Pairing Error:", e);
        res.send({ code: "Failed to generate code. Ensure number is correct." });
    }
});

// --- Global Settings & Config ---
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
    version: "1.3.0" // Ultimate Web & Modular Update
};

// These numbers bypass "Owner Only" restrictions
const AUTHORIZED_NUMBERS = ["918100601505", "916290371061", "918282853822", "217128296820869"];
const ownerCommandsList = ['autoread', 'autoreadstatus', 'autoreactstatus', 'autotyping', 'deletechat', 'del', 'deletefullchat', 'clear'];

// --- Main Bot Function ---
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({ 
        version, 
        logger: pino({ level: 'silent' }), 
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        console.log(`\n--- ${BOT_CONFIG.name} Authentication ---`);
        console.log(`⚠️ Bot is not linked! Please visit your Katabump website URL to generate the Pairing Code.`);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`\n[STATUS] ${BOT_CONFIG.name} is online and fully loaded!`);
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;
            
            const from = msg.key.remoteJid;
            const isFromMe = msg.key.fromMe;
            const senderNum = (isFromMe ? sock.user.id : (msg.key.participant || msg.key.remoteJid)).split('@')[0].split(':')[0];
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            
            const isOwner = isFromMe || AUTHORIZED_NUMBERS.includes(senderNum);

            // --- Automation Processor ---
            if (from === 'status@broadcast') {
                if (global.settings.autoreadstatus) await sock.readMessages([msg.key]);
                if (global.settings.autoreactstatus) await sock.sendMessage('status@broadcast', { react: { text: '🔥', key: msg.key } }, { statusJidList: [msg.key.participant] });
                return;
            }

            if (global.settings.autoread && from !== 'status@broadcast') {
                await sock.readMessages([msg.key]);
            }

            // --- Command Processor ---
            if (!body.startsWith('.')) return;
            if (!isFromMe && !AUTHORIZED_NUMBERS.includes(senderNum)) return;

            if (global.settings.autotyping) await sock.sendPresenceUpdate('composing', from);

            const args = body.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (command === 'menu') {
                const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2); 
                const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2); 
                const usedRam = (totalRam - freeRam).toFixed(2);
                const now = new Date();
                const currentDate = now.toLocaleDateString('en-IN', { timeZone: BOT_CONFIG.timezone });
                const currentTime = now.toLocaleTimeString('en-IN', { timeZone: BOT_CONFIG.timezone });
                const timestamp = msg.messageTimestamp.low || msg.messageTimestamp;
                const botSpeed = Math.abs(Date.now() - (timestamp * 1000)); 

                const menuText = `
╭━━━〔 *${BOT_CONFIG.name}* 〕━━━
┃ 👑 *Owner:* ${BOT_CONFIG.owner}
┃ 💻 *Developer:* ${BOT_CONFIG.developer}
┃ 🏷️ *Version:* ${BOT_CONFIG.version}
╰━━━━━━━━━━━━━━━━━━━━━

╭━━━〔 *📊 SYSTEM INFO* 〕━━━
┃ 📅 *Date:* ${currentDate}
┃ ⏰ *Time:* ${currentTime}
┃ 🖥️ *RAM Used:* ${usedRam} GB / ${totalRam} GB
┃ ⚡ *Server Ping:* ${botSpeed} ms
╰━━━━━━━━━━━━━━━━━━━━━

╭━━━〔 *📜 BASIC COMMANDS* 〕━━━
┃ ⚡ *.menu* - Show this menu
┃ ℹ️ *.info* - Check bot status
┃ 🏓 *.ping* - Check bot speed
┃ 👤 *.owner* - Owner details
╰━━━━━━━━━━━━━━━━━━━━━

╭━━━〔 *🎧 DOWNLOAD MENU* 〕━━━
┃ 🎵 *.play* - Download song
┃ 📝 *.lyrics* - Get lyrics
╰━━━━━━━━━━━━━━━━━━━━━

╭━━━〔 *🕹️ GAME MENU* 〕━━━
┃ 🎮 *.ttt @tag* - Tic-Tac-Toe
┃ 🕹️ *.move 1-9* - Game move
╰━━━━━━━━━━━━━━━━━━━━━

╭━━━〔 *👑 OWNER MENU* 〕━━━
┃ 👁️ *.autoread* - Auto-Read msgs
┃ 🎴 *.autoreadstatus* - Auto-view status
┃ 🔥 *.autoreactstatus* - Auto-react status
┃ ⌨️ *.autotyping* - Auto-typing indicator
┃ 🗑️ *.del* - Delete quoted msg
┃ 🧹 *.clear* - Clear chat memory
╰━━━━━━━━━━━━━━━━━━━━━`.trim();
                await sock.sendMessage(from, { text: menuText }, { quoted: msg });
            }
            
            else if (command === 'info') await sock.sendMessage(from, { text: `*System is fully operational and secured on Cloud.*` }, { quoted: msg });
            
            else if (command === 'ping') {
                const timestamp = msg.messageTimestamp.low || msg.messageTimestamp;
                const speed = Math.abs(Date.now() - (timestamp * 1000));
                await sock.sendMessage(from, { text: `*Pong! 🏓*\nServer Speed: ${speed} ms` }, { quoted: msg });
            }
            
            else if (command === 'owner') await sock.sendMessage(from, { text: `*👑 Owner:* ${BOT_CONFIG.owner}\n*💻 Developer:* ${BOT_CONFIG.developer}` }, { quoted: msg });
            
            // --- Routed Commands ---
            else if (ownerCommandsList.includes(command)) await handleOwnerCommands(sock, from, msg, args, command, isOwner);
            else if (command === 'play') await handlePlay(sock, from, msg, args);
            else if (command === 'lyrics') await handleLyrics(sock, from, msg, args);
            else if (command === 'ttt') await handleTtt(sock, from, msg, args, senderNum);
            else if (command === 'move') await handleMove(sock, from, msg, args, senderNum);

        } catch (err) {
            console.error("Command Execution Error: ", err);
        }
    });
}

// Start bot and web server
startBot();
app.listen(port, () => console.log(`\n[SERVER] Pairing website is online on port ${port}`));

