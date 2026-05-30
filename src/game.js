const tttGames = {};

function renderBoard(board) {
    let str = '\n';
    for (let i = 0; i < 9; i++) {
        str += board[i] === '' ? `  ${i + 1}️⃣  ` : (board[i] === 'X' ? '  ❌  ' : '  ⭕  ');
        if ((i + 1) % 3 === 0) str += '\n\n';
    }
    return str;
}

function checkWin(board) {
    const lines = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

async function handleTtt(sock, from, msg, args, senderNum) {
    if (tttGames[from]) {
        if (args[0] === 'end') {
            delete tttGames[from];
            return sock.sendMessage(from, { text: "🛑 The game has been ended." }, { quoted: msg });
        }
        return sock.sendMessage(from, { text: "⚠️ A game is already in progress. Type .ttt end to stop it." }, { quoted: msg });
    }

    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length === 0) return sock.sendMessage(from, { text: `⚠️ Tag a friend to play with!` }, { quoted: msg });

    tttGames[from] = {
        board: Array(9).fill(''),
        turn: 'X',
        players: { 'X': senderNum + "@s.whatsapp.net", 'O': mentioned[0] }
    };

    const boardText = renderBoard(tttGames[from].board);
    await sock.sendMessage(from, { 
        text: `🎮 *Tic-Tac-Toe Started!*\n${boardText}\n👉 It's ❌'s turn. Type: \n*.move <1-9>*`, 
        mentions: [tttGames[from].players.X, tttGames[from].players.O] 
    });
}

async function handleMove(sock, from, msg, args, senderNum) {
    if (!tttGames[from]) return sock.sendMessage(from, { text: "⚠️ No game running. Start with .ttt @tag" }, { quoted: msg });
    const game = tttGames[from];
    if ((senderNum + "@s.whatsapp.net") !== game.players[game.turn]) return sock.sendMessage(from, { text: "⚠️ Not your turn!" }, { quoted: msg });

    const pos = parseInt(args[0]) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8 || game.board[pos] !== '') return sock.sendMessage(from, { text: "⚠️ Invalid move!" }, { quoted: msg });

    game.board[pos] = game.turn;
    const winner = checkWin(game.board);
    
    if (winner) {
        await sock.sendMessage(from, { text: `🎉 *Game Over!*\n${renderBoard(game.board)}\n🏆 @${game.players[winner].split('@')[0]} wins!`, mentions: [game.players[winner]] });
        delete tttGames[from];
    } else if (!game.board.includes('')) {
        await sock.sendMessage(from, { text: `😲 *Draw!*\n${renderBoard(game.board)}` });
        delete tttGames[from];
    } else {
        game.turn = game.turn === 'X' ? 'O' : 'X';
        await sock.sendMessage(from, { text: `🎮 *Tic-Tac-Toe*\n${renderBoard(game.board)}\n👉 Now @${game.players[game.turn].split('@')[0]}'s turn (${game.turn}).`, mentions: [game.players[game.turn]] });
    }
}

module.exports = { handleTtt, handleMove };

