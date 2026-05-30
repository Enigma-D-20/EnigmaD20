const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const os = require('os'); 

const BOT_CONFIG = {
    name: "Enigma D20",
    owner: "Abhrodeep Dey",
    developer: "Rohan Sharma",
    timezone: "Asia/Kolkata",
    version: "1.0.4" // Fixed Whitelist & Owner Bypass
};

// 🔥 ADDED: Abhrodeep's Hidden WhatsApp ID (217128296820869)
const AUTHORIZED_NUMBERS = [
    "918100601505",
    "916290371061",
    "918282853822",
    "217128296820869" 
];

process.env.TZ = BOT_CONFIG.timezone;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

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

    if (!sock.authState.creds.registered) {
        console.log(`\n--- ${BOT_CONFIG.name} Authentication ---`);
        const phoneNumber = await question('Enter your WhatsApp phone number with country code (e.g., 91XXXXXXXXXX): ');
        const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');

        if (!cleanedNumber) {
            console.log('Invalid phone number. Restart the script.');
            process.exit(1);
        }

        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(cleanedNumber);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`\n👉 Your Pairing Code: ${code}\n`);
                console.log('Open WhatsApp -> Linked Devices -> Link with phone number instead, and enter this code.');
            } catch (error) {
                console.error('Failed to generate pairing code:', error);
            }
        }, 3000); 
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`Connection closed. Reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log(`\n======================================`);
            console.log(`🤖 Bot Name  : ${BOT_CONFIG.name}`);
            console.log(`👑 Owner     : ${BOT_CONFIG.owner}`);
            console.log(`💻 Developer : ${BOT_CONFIG.developer}`);
            console.log(`🔒 Security  : Whitelist Enabled`);
            console.log(`======================================`);
            console.log(`\n[STATUS] ${BOT_CONFIG.name} is online and secured!`);

            setTimeout(async () => {
                try {
                    const targetNumber = '916290371061@s.whatsapp.net'; 
                    const connectionMessage = "Well! Done connected to the Bot";
                    await sock.sendMessage(targetNumber, { text: connectionMessage });
                    console.log(`[LOG] Startup message sent to 916290371061`);
                } catch (err) {
                    console.error("[ERROR] Failed to send startup message:", err);
                }
            }, 3000);
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            
            // 🔥 FIXED: Removed the 'fromMe' block here so the owner can test commands!
            if (!msg.message) return; 

            const isFromMe = msg.key.fromMe;
            const from = msg.key.remoteJid;
            
            // Extract the sender ID properly
            let rawSender = isFromMe ? sock.user.id : (msg.key.participant || msg.key.remoteJid);
            let senderNum = rawSender.split('@')[0].split(':')[0]; 

            let body = '';
            if (msg.message.conversation) {
                body = msg.message.conversation;
            } else if (msg.message.extendedTextMessage) {
                body = msg.message.extendedTextMessage.text;
            } else if (msg.message.imageMessage) {
                body = msg.message.imageMessage.caption || '';
            } else if (msg.message.videoMessage) {
                body = msg.message.videoMessage.caption || '';
            }

            const prefix = '.';
            if (!body.startsWith(prefix)) return;

            console.log(`[DEBUG] Command received from: ${senderNum} | isOwner: ${isFromMe}`);

            // 🔥 SECURITY CHECK: Always allow if it's the bot's own number, otherwise check whitelist
            if (!isFromMe && !AUTHORIZED_NUMBERS.includes(senderNum)) {
                console.log(`[SECURITY] Blocked command from unauthorized number: ${senderNum}`);
                return; // Ignore completely
            }

            console.log(`[SECURITY] Access Granted! Executing command...`);

            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            // ------------------------------------
            //           BOT COMMANDS
            // ------------------------------------

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
┃ ⚡ *Bot Ping:* ${botSpeed} ms
╰━━━━━━━━━━━━━━━━━━━━━

╭━━━〔 *📜 COMMAND MENU* 〕━━━
┃ ⚡ *${prefix}menu* - Show this menu
┃ ℹ️ *${prefix}info* - Check bot status
┃ 🏓 *${prefix}ping* - Check bot speed
┃ 👤 *${prefix}owner* - Owner details
╰━━━━━━━━━━━━━━━━━━━━━
`.trim();
                
                await sock.sendMessage(from, { text: menuText }, { quoted: msg });
            }

            else if (command === 'info') {
                await sock.sendMessage(from, { text: `*System is fully operational and secured.*` }, { quoted: msg });
            }

            else if (command === 'ping') {
                const timestamp = msg.messageTimestamp.low || msg.messageTimestamp;
                const speed = Math.abs(Date.now() - (timestamp * 1000));
                await sock.sendMessage(from, { text: `*Pong! 🏓*\nBot Speed: ${speed} ms` }, { quoted: msg });
            }

            else if (command === 'owner') {
                await sock.sendMessage(from, { text: `*👑 Owner:* ${BOT_CONFIG.owner}\n*💻 Developer:* ${BOT_CONFIG.developer}` }, { quoted: msg });
            }

        } catch (err) {
            console.error("Error handling message: ", err);
        }
    });
}

startBot();

