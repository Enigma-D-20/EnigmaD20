// src/owner.js

async function handleOwnerCommands(sock, from, msg, args, command, isOwner) {
    if (!isOwner) {
        return sock.sendMessage(from, { text: "⛔ Access Denied! This command is strictly restricted to the Owner and Developer." }, { quoted: msg });
    }

    if (command === 'autoread') {
        global.settings.autoread = !global.settings.autoread;
        return sock.sendMessage(from, { text: `⚙️ Auto-Read is now: *${global.settings.autoread ? "ON" : "OFF"}*` }, { quoted: msg });
    }
    
    else if (command === 'autoreadstatus') {
        global.settings.autoreadstatus = !global.settings.autoreadstatus;
        return sock.sendMessage(from, { text: `⚙️ Auto-Read Status is now: *${global.settings.autoreadstatus ? "ON" : "OFF"}*` }, { quoted: msg });
    }
    
    else if (command === 'autoreactstatus') {
        global.settings.autoreactstatus = !global.settings.autoreactstatus;
        return sock.sendMessage(from, { text: `⚙️ Auto-React Status is now: *${global.settings.autoreactstatus ? "ON" : "OFF"}*` }, { quoted: msg });
    }
    
    else if (command === 'autotyping') {
        global.settings.autotyping = !global.settings.autotyping;
        return sock.sendMessage(from, { text: `⚙️ Auto-Typing is now: *${global.settings.autotyping ? "ON" : "OFF"}*` }, { quoted: msg });
    }
    
    else if (command === 'deletechat' || command === 'del') {
        const quotedMsg = msg.message.extendedTextMessage?.contextInfo;
        if (!quotedMsg || !quotedMsg.stanzaId) {
            return sock.sendMessage(from, { text: "⚠️ Please reply to a specific message you want to delete." }, { quoted: msg });
        }
        
        const key = {
            remoteJid: from,
            fromMe: quotedMsg.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
            id: quotedMsg.stanzaId,
            participant: quotedMsg.participant
        };
        
        try {
            await sock.sendMessage(from, { delete: key });
        } catch (error) {
            await sock.sendMessage(from, { text: "❌ Failed to delete the message. (If in a group, the bot must be an Admin to delete others' messages)." }, { quoted: msg });
        }
    }
    
    else if (command === 'deletefullchat' || command === 'clear') {
        try {
            await sock.chatModify({ 
                clear: { 
                    messages: [{ id: msg.key.id, fromMe: true, timestamp: msg.messageTimestamp }] 
                } 
            }, from, []);
            return sock.sendMessage(from, { text: "🗑️ Full chat conversation successfully cleared from the bot's memory!" });
        } catch (error) {
            console.error(error);
            return sock.sendMessage(from, { text: "❌ Failed to clear the chat." }, { quoted: msg });
        }
    }
}

module.exports = { handleOwnerCommands };

