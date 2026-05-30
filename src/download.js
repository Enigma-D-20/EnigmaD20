const yts = require('yt-search');
const play = require('play-dl');
const lyricsFinder = require('lyrics-finder');
const fs = require('fs');

async function handlePlay(sock, from, msg, args) {
    const songQuery = args.join(" ");
    if (!songQuery) return sock.sendMessage(from, { text: `⚠️ Please provide a song name!` }, { quoted: msg });
    
    await sock.sendMessage(from, { text: `🎵 Searching for *${songQuery}*...` }, { quoted: msg });

    try {
        const search = await yts(songQuery);
        const video = search.videos[0];
        if (!video) return sock.sendMessage(from, { text: "❌ No song found." }, { quoted: msg });
        
        const infoText = `*${video.title}*\n⬇️ Processing audio...`;
        await sock.sendMessage(from, { image: { url: video.thumbnail }, caption: infoText }, { quoted: msg });
        
        const stream = await play.stream(video.url);
        const filePath = `./temp_${Date.now()}.mp3`; 
        const fileStream = fs.createWriteStream(filePath);
        
        stream.stream.pipe(fileStream);

        fileStream.on('finish', async () => {
            try {
                await sock.sendMessage(from, { audio: { url: filePath }, mimetype: 'audio/mp4' }, { quoted: msg });
                fs.unlinkSync(filePath); 
            } catch (sendErr) {
                await sock.sendMessage(from, { text: "❌ Failed to send audio." }, { quoted: msg });
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        });
    } catch (err) {
        await sock.sendMessage(from, { text: "❌ Download failed due to YouTube security block." }, { quoted: msg });
    }
}

async function handleLyrics(sock, from, msg, args) {
    const songQuery = args.join(" ");
    if (!songQuery) return;
    try {
        const lyrics = await lyricsFinder("", songQuery);
        if (lyrics) {
            await sock.sendMessage(from, { text: `*📝 Lyrics: ${songQuery}*\n\n${lyrics}` }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: "❌ Sorry, lyrics not found for this song." }, { quoted: msg });
        }
    } catch (err) {
        console.error(err);
    }
}

module.exports = { handlePlay, handleLyrics };

