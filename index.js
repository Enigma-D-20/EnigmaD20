const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const os = require('os');
const { handlePlay, handleLyrics } = require('./src/download');
const { handleTtt, handleMove } = require('./src/game');

const BOT_CONFIG = { name: "Enigma D20", owner: "Abhrodeep Dey", version: "1.1.1", botNumber: "91XXXXXXXXXX" };
const AUTHORIZED_NUMBERS = ["918100601505", "916290371061", "918282853822", "217128296820869"];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({ version: (await fetchLatestBaileysVersion()).version, logger: pino({ level: 'silent' }), auth: state });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const msg = chatUpdate.messages[0];
        if (!msg.message) return;
        const from = msg.key.remoteJid;
        const isFromMe = msg.key.fromMe;
        const senderNum = (isFromMe ? sock.user.id : (msg.key.participant || msg.key.remoteJid)).split('@')[0].split(':')[0];
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (!body.startsWith('.')) return;
        if (!isFromMe && !AUTHORIZED_NUMBERS.includes(senderNum)) return;

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'menu') {
            const menu = `╭━━━〔 *${BOT_CONFIG.name}* 〕━━━\n┃ 🎵 *.play* - Download song\n┃ 📝 *.lyrics* - Get lyrics\n┃ 🎮 *.ttt* - Tic-Tac-Toe\n┃ 🕹️ *.move* - Game move\n╰━━━━━━━━━━━━━`;
            await sock.sendMessage(from, { text: menu });
        }
        else if (command === 'play') await handlePlay(sock, from, msg, args);
        else if (command === 'lyrics') await handleLyrics(sock, from, msg, args);
        else if (command === 'ttt') await handleTtt(sock, from, msg, args, senderNum);
        else if (command === 'move') await handleMove(sock, from, msg, args, senderNum);
    });
}
startBot();

