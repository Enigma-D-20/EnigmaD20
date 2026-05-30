const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');

async function handleOwnerCommands(sock, from, msg, args, command, isOwner) {
    if (!isOwner) {
        return sock.sendMessage(from, { text: "⛔ Access Denied!" }, { quoted: msg });
    }

    // --- GITHUB AUTO UPDATE ---
    if (command === 'update') {
        await sock.sendMessage(from, { text: "🔄 GitHub se naye updates check kar raha hu..." }, { quoted: msg });
        
        exec('git pull origin main', (error, stdout, stderr) => {
            if (error) {
                return sock.sendMessage(from, { text: `❌ Update Failed:\n\n${error.message}` }, { quoted: msg });
            }
            if (stdout.includes('Already up to date.')) {
                return sock.sendMessage(from, { text: "✅ System is already up to date! Koi naya update nahi hai." }, { quoted: msg });
            }
            sock.sendMessage(from, { text: `✅ Update Successful!\n\n*Changes:*\n${stdout}\n\n⚠️ Naye changes apply karne ke liye bot ko terminal se ek baar restart karein.` }, { quoted: msg });
        });
        return;
    }

    // --- VIEW ONCE BYPASS (UNIVERSAL) ---
    else if (command === 'vv') {
        let quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return sock.sendMessage(from, { text: "⚠️ Please reply to an image or video." }, { quoted: msg });

        // Sab naye WhatsApp view once formats check karega
        let viewOnce = quoted.viewOnceMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension || quoted.viewOnceMessageV2Embed;
        
        let media;
        let type;

        if (viewOnce) {
            type = Object.keys(viewOnce.message)[0];
            media = viewOnce.message[type];
        } else if (quoted.imageMessage || quoted.videoMessage) {
            // Zabardasti Fallback (Agar bot View Once pehchan na paye, toh bhi nikal lega)
            type = quoted.imageMessage ? 'imageMessage' : 'videoMessage';
            media = quoted[type];
        } else {
            return sock.sendMessage(from, { text: "⚠️ Koi image ya video nahi mili!" }, { quoted: msg });
        }
        
        try {
            let stream = await downloadContentFromMessage(media, type === 'imageMessage' ? 'image' : 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (type === 'imageMessage') {
                await sock.sendMessage(from, { image: buffer, caption: "✅ View Once Bypassed" }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { video: buffer, caption: "✅ View Once Bypassed" }, { quoted: msg });
            }
        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, { text: "❌ Media download fail ho gaya." }, { quoted: msg });
        }
    }

    // --- EXISTING COMMANDS ---
    else if (command === 'autoread') {
        global.settings.autoread = !global.settings.autoread;
        return sock.sendMessage(from, { text: `⚙️ Auto-Read: ${global.settings.autoread ? "ON" : "OFF"}` }, { quoted: msg });
    }
    else if (command === 'autoreadstatus') {
        global.settings.autoreadstatus = !global.settings.autoreadstatus;
        return sock.sendMessage(from, { text: `⚙️ Auto-Read Status: ${global.settings.autoreadstatus ? "ON" : "OFF"}` }, { quoted: msg });
    }
    else if (command === 'autoreactstatus') {
        global.settings.autoreactstatus = !global.settings.autoreactstatus;
        return sock.sendMessage(from, { text: `⚙️ Auto-React Status: ${global.settings.autoreactstatus ? "ON" : "OFF"}` }, { quoted: msg });
    }
    else if (command === 'autotyping') {
        global.settings.autotyping = !global.settings.autotyping;
        return sock.sendMessage(from, { text: `⚙️ Auto-Typing: ${global.settings.autotyping ? "ON" : "OFF"}` }, { quoted: msg });
    }
    else if (command === 'del') {
        const quotedMsg = msg.message.extendedTextMessage?.contextInfo;
        if (!quotedMsg) return sock.sendMessage(from, { text: "⚠️ Reply to a message." }, { quoted: msg });
        const key = { remoteJid: from, fromMe: quotedMsg.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net', id: quotedMsg.stanzaId, participant: quotedMsg.participant };
        try { await sock.sendMessage(from, { delete: key }); } catch (e) { sock.sendMessage(from, { text: "❌ Failed." }); }
    }
    else if (command === 'clear') {
        await sock.chatModify({ clear: { messages: [{ id: msg.key.id, fromMe: true, timestamp: msg.messageTimestamp }] } }, from, []);
        return sock.sendMessage(from, { text: "🗑️ Chat cleared!" });
    }
}

module.exports = { handleOwnerCommands };

