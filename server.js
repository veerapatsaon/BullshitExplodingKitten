const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.get("/", (_, res) => res.sendFile(__dirname + "/public/lobby.html"));

const rooms = {};

// ===== UTILS =====
function nextAlive(room, fromIndex) {
    if (!room || !room.players || room.players.length === 0) return fromIndex;
    let i = fromIndex;
    const total = room.players.length;
    do {
        i = (i + 1) % total;
    } while (!room.players[i].alive);
    return i;
}

function selectDeckByPlayerCount(playerCount) {
    if (playerCount <= 3) return [...DECKS.small];
    if (playerCount <= 7) return [...DECKS.medium];
    return [...DECKS.large];
}

function genCode() { return Math.random().toString(36).substring(2, 7).toUpperCase(); }
function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }

function pushLog(room, kind, text) {
    if (!room.logs) room.logs = [];
    room.logs.push({ time: new Date().toLocaleTimeString("th-TH", { hour12: false }), kind, text });
    if (room.logs.length > 200) room.logs.shift();
}

// 🚩 ฟังก์ชันเช็คผู้ชนะ
function checkWinner(room) {
    const alivePlayers = room.players.filter(p => p.alive);
    if (alivePlayers.length === 1) {
        const winner = alivePlayers[0];
        pushLog(room, "system", `🎉 เกมจบแล้ว! ผู้ชนะคือ ${winner.name}`);
        io.to(room.code).emit("gameOver", { winnerName: winner.name });
        room.started = false; 
        return true;
    }
    return false;
}

// ====== DECK =====
const DECKS = {
    small: [
      "ข้าม","ข้าม","ข้าม","ข้าม",
      "ม่าย","ม่าย","ม่าย","ม่าย",
      "โจมตี","โจมตี","โจมตี","โจมตี",
      "สับไพ่","สับไพ่",
      "ดูอนาคต","ดูอนาคต","ดูอนาคต",
      "จั่วจากใต้กอง","จั่วจากใต้กอง","จั่วจากใต้กอง",
      "แมวขนหยิก","แมวขนหยิก","แมวขนหยิก",
      "แมวแตงโม","แมวแตงโม","แมวแตงโม",
      "แมวทาโก้","แมวทาโก้","แมวทาโก้",
      "แมวสายรุ้ง","แมวสายรุ้ง","แมวสายรุ้ง",
      "แมวมันฝรั่ง","แมวมันฝรั่ง","แมวมันฝรั่ง",
      "เปลี่ยนอนาคต","เปลี่ยนอนาคต",
      "แก้ระเบิด","แก้ระเบิด","แก้ระเบิด"],
    medium: ["ข้าม","ข้าม","ข้าม","ข้าม","ข้าม","ข้าม","ม่าย","ม่าย","ม่าย","ม่าย","ม่าย","โจมตี","โจมตี","โจมตี","โจมตี","โจมตี","โจมตี","สับไพ่","สับไพ่","สับไพ่","สับไพ่","ดูอนาคต","ดูอนาคต","ดูอนาคต","จั่วจากใต้กอง","จั่วจากใต้กอง","จั่วจากใต้กอง","จั่วจากใต้กอง","แมวขนหยิก","แมวขนหยิก","แมวขนหยิก","แมวขนหยิก","แมวแตงโม","แมวแตงโม","แมวแตงโม","แมวแตงโม","แมวทาโก้","แมวทาโก้","แมวทาโก้","แมวทาโก้","แมวสายรุ้ง","แมวสายรุ้ง","แมวสายรุ้ง","แมวสายรุ้ง","แมวมันฝรั่ง","แมวมันฝรั่ง","แมวมันฝรั่ง","แมวมันฝรั่ง","เปลี่ยนอนาคต","เปลี่ยนอนาคต","เปลี่ยนอนาคต","เปลี่ยนอนาคต","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด"],
    large: ["ข้าม","ข้าม","ข้าม","ข้าม","ข้าม","ข้าม","ข้าม","ข้าม","ข้าม","ข้าม","ม่าย","ม่าย","ม่าย","ม่าย","ม่าย","ม่าย","ม่าย","ม่าย","ม่าย","โจมตี","โจมตี","โจมตี","โจมตี","โจมตี","โจมตี","โจมตี","โจมตี","โจมตี","โจมตี","สับไพ่","สับไพ่","สับไพ่","สับไพ่","สับไพ่","สับไพ่","ดูอนาคต","ดูอนาคต","ดูอนาคต","ดูอนาคต","ดูอนาคต","ดูอนาคต","จั่วจากใต้กอง","จั่วจากใต้กอง","จั่วจากใต้กอง","จั่วจากใต้กอง","แมวขนหยิก","แมวขนหยิก","แมวขนหยิก","แมวขนหยิก","แมวขนหยิก","แมวขนหยิก","แมวขนหยิก","แมวแตงโม","แมวแตงโม","แมวแตงโม","แมวแตงโม","แมวแตงโม","แมวแตงโม","แมวแตงโม","แมวทาโก้","แมวทาโก้","แมวทาโก้","แมวทาโก้","แมวทาโก้","แมวทาโก้","แมวทาโก้","แมวสายรุ้ง","แมวสายรุ้ง","แมวสายรุ้ง","แมวสายรุ้ง","แมวสายรุ้ง","แมวสายรุ้ง","แมวสายรุ้ง","แมวมันฝรั่ง","แมวมันฝรั่ง","แมวมันฝรั่ง","แมวมันฝรั่ง","แมวมันฝรั่ง","แมวมันฝรั่ง","แมวมันฝรั่ง","เปลี่ยนอนาคต","เปลี่ยนอนาคต","เปลี่ยนอนาคต","เปลี่ยนอนาคต","เปลี่ยนอนาคต","เปลี่ยนอนาคต","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด","แก้ระเบิด"]
};

// ===== SOCKET =====
io.on("connection", socket => {
    socket.on("createRoom", ({ name, clientId }) => {
        if (!name || !clientId) return;
        const code = genCode();
        rooms[code] = {
            code, hostClientId: clientId, started: false, turn: 0, attackStack: 0,
            players: [{ clientId, socketId: socket.id, name, hand: [], alive: true }],
            pendingAction: null, discardPile: [],logs: []
        };

        socket.join(code);
        socket.emit("roomJoined", { code });
        io.to(code).emit("state", rooms[code]);
    });

    socket.on("joinRoom", ({ code, name, clientId }) => {
        const room = rooms[code];
        if (!room || !clientId) return;
        let player = room.players.find(p => p.clientId === clientId);
        if (player) {
            player.socketId = socket.id;
        } else {
            room.players.push({ clientId, socketId: socket.id, name, hand: [], alive: true });
        }
        socket.join(code);
        socket.emit("roomJoined", { code });
        io.to(code).emit("state", room);
    });

    socket.on("startGame", code => {
        const room = rooms[code];
        if (!room || room.started) return;
        const hostPlayer = room.players.find(p => p.clientId === room.hostClientId);
        if (!hostPlayer || hostPlayer.socketId !== socket.id) return;

        room.deck = shuffle(selectDeckByPlayerCount(room.players.length));
        room.players.forEach(p => {
            p.hand = []; p.alive = true;
            let drawn = 0;
            while (drawn < 4 && room.deck.length) {
                const c = room.deck.pop();
                if (c !== "แก้ระเบิด") { p.hand.push(c); drawn++; } 
                else { room.deck.unshift(c); }
            }
            p.hand.push("แก้ระเบิด");
        });
        for (let i = 0; i < room.players.length - 1; i++) {
            room.deck.splice(Math.floor(Math.random() * room.deck.length), 0, "ระเบิด");
        }
        room.started = true;
        pushLog(room, "system", "🎮 เริ่มเกม");
        io.to(code).emit("state", room);
    });

    socket.on("drawCard", code => {
        const room = rooms[code];
        if (!room || !room.started || room.pendingBomb) return;
        const player = room.players[room.turn];
        if (!player || player.socketId !== socket.id || !player.alive) return;

        const card = room.deck.pop();
        if (card === "ระเบิด") {
          io.to(code).emit("shakeScreen");
    const defuseIndex = player.hand.indexOf("แก้ระเบิด");
    io.to(code).emit("shakeScreen");
    if (defuseIndex !== -1) {
        // 🚩 แก้ไขตรงนี้: ลบและเก็บเข้ากองทิ้ง
        const usedDefuse = player.hand.splice(defuseIndex, 1)[0];
        room.discardPile.push(usedDefuse); 

        room.pendingBomb = { playerClientId: player.clientId, maxPos: room.deck.length };
        io.to(player.socketId).emit("chooseBombPosition", room.deck.length);
        
        pushLog(room, "bomb", `🛡️ ${player.name} ใช้แก้ระเบิด!`);
        io.to(code).emit("state", room);
        return;
    } else {
                player.alive = false;
                pushLog(room, "bomb", `💀 ${player.name} ออกจากเกม!`);
                if (checkWinner(room)) return;
                room.turn = nextAlive(room, room.turn);
            }
        } else {
            player.hand.push(card);
            pushLog(room, "draw", `🃏 ${player.name} จั่วการ์ด`);
            if (room.attackStack > 0) {
                room.attackStack--;
                if (room.attackStack === 0) room.turn = nextAlive(room, room.turn);
            } else {
                room.turn = nextAlive(room, room.turn);
            }
        }
        io.to(code).emit("state", room);
    });

    socket.on("placeBomb", ({ code, position }) => {
        const room = rooms[code];
        if (!room || !room.pendingBomb) return;
        const pos = Math.max(0, Math.min(position, room.pendingBomb.maxPos));
        room.deck.splice(room.deck.length - pos, 0, "ระเบิด");
        room.pendingBomb = null;
        room.turn = nextAlive(room, room.turn);
        io.to(code).emit("state", room);
    });

socket.on("playCard", ({ code, card, targetClientId, useCount, requestedCard }) => {
    const room = rooms[code];
    if (!room || !room.started || room.pendingAction) return;
    const player = room.players[room.turn];
    if (!player || !player.alive) return;

    const needed = useCount || 1;
    const cardsInHand = player.hand.filter(c => c === card);
    if (cardsInHand.length < needed) return;

    // 🚩 ลบไพ่และ Push ลงกองทิ้งในรอบเดียว
    let removed = 0;
    const newHand = [];
    player.hand.forEach(c => {
        if (c === card && removed < needed) {
            removed++;
            room.discardPile.push(c); // เก็บเข้ากองทิ้ง
        } else {
            newHand.push(c);
        }
    });
    player.hand = newHand;

    room.pendingAction = { 
        playerClientId: player.clientId, 
        card, 
        targetClientId,
        requestedCard,
        endAt: Date.now() + 3000 
    };

    pushLog(room, "system", `⏳ ${player.name} จ่าย ${card} x${needed}`);
    io.to(code).emit("state", room);
    room.nopeTimer = setTimeout(() => resolvePendingAction(code), 3000);
});

    socket.on("playNope", code => {
        const room = rooms[code];
        if (!room || !room.pendingAction) return;
        const player = room.players.find(p => p.socketId === socket.id);
        if (!player || !player.alive) return;
        const idx = player.hand.indexOf("ม่าย");
        if (idx === -1 || player.clientId === room.pendingAction.playerClientId) return;

        player.hand.splice(idx, 1);
        clearTimeout(room.nopeTimer);
        pushLog(room, "system", `❌ ${player.name} ใช้ Nope`);
        room.pendingAction = null;
        io.to(code).emit("state", room);
    });
    socket.on("playFiveCombo", ({ code, cards, requestedCard }) => {
    const room = rooms[code];
    if (!room || !room.started || room.pendingAction) return;
    const player = room.players[room.turn];

    // ตรวจสอบว่ามีไพ่ทั้ง 5 ใบจริงไหม
    let hasAll = true;
    const tempHand = [...player.hand];
    cards.forEach(c => {
        const idx = tempHand.indexOf(c);
        if (idx === -1) hasAll = false;
        else tempHand.splice(idx, 1);
    });

    if (!hasAll) return;

    // ลบไพ่ 5 ใบนั้นออก
    cards.forEach(c => {
        const idx = player.hand.indexOf(c);
        room.discardPile.push(player.hand.splice(idx, 1)[0]);
    });

    room.pendingAction = {
        playerClientId: player.clientId,
        card: "COMBO_5",
        requestedCard: requestedCard,
        endAt: Date.now() + 3000
    };

    pushLog(room, "system", `⏳ ${player.name} จ่าย 5 ใบไม่ซ้ำเพื่อกู้ชีพ "${requestedCard}"`);
    io.to(code).emit("state", room);
    room.nopeTimer = setTimeout(() => resolvePendingAction(code), 3000);
});
    socket.on("submitFutureOrder", ({ code, order }) => {
        const room = rooms[code];
        if (!room || !room.pendingAction) return;
        room.deck.splice(-order.length);
        [...order].reverse().forEach(c => room.deck.push(c));
        room.pendingAction = null;
        io.to(code).emit("state", room);
    });
});

function resolvePendingAction(code) {
    const room = rooms[code];
    if (!room || !room.pendingAction) return;
    const { playerClientId, card } = room.pendingAction;
    const player = room.players.find(p => p.clientId === playerClientId && p.alive);
    if (!player) return room.pendingAction = null;

    pushLog(room, "card", `🃏 ผลของการ์ด ${card} ทำงาน`);
    switch (card) {
        case "จั่วจากใต้กอง": {
    const bottomCard = room.deck.shift();
    if (bottomCard === "ระเบิด") {
        const defIndex = player.hand.indexOf("แก้ระเบิด");
        if (defIndex !== -1) {
            // 🚩 แก้ไขตรงนี้ด้วย
            const usedDefuse = player.hand.splice(defIndex, 1)[0];
            room.discardPile.push(usedDefuse);
            
            room.deck.splice(Math.floor(Math.random() * room.deck.length), 0, "ระเบิด");
            pushLog(room, "bomb", `🛡️ ${player.name} จั่วใต้กองเจอระเบิดแต่แก้ได้!`);
            handleAfterDraw(room, player);
        } else {
            player.alive = false;
            pushLog(room, "bomb", `💀 ${player.name} เจอระเบิดใต้กองและระเบิดตู้ม!`);
            if (checkWinner(room)) return;
            room.turn = nextAlive(room, room.turn);
        }
    } else {
        player.hand.push(bottomCard);
        pushLog(room, "draw", `🃏 ${player.name} จั่วการ์ดใต้กอง`);
        
        // 🚩 กรณีได้การ์ดปกติ ต้องจัดการ Stack/Turn เหมือนการจั่วจากบนกอง
        handleAfterDraw(room, player);
    }
    break;
  }
        case "ข้าม":
        // 🚩 แก้ไข Logic: ถ้ามี Attack Stack ให้หักออก 1
        if (room.attackStack > 0) {
            room.attackStack--;
            pushLog(room, "skip", `🛡️ ${player.name} ใช้การ์ดข้าม หักล้างการจั่ว (เหลือต้องจั่ว: ${room.attackStack})`);
            
            // ถ้าหักแล้วเหลือ 0 ถึงจะเปลี่ยนเทิร์นไปคนถัดไป
            if (room.attackStack === 0) {
                room.turn = nextAlive(room, room.turn);
            }
        } else {
            // กรณีปกติ (ไม่มี Stack) ให้ข้ามเทิร์นทันที
            pushLog(room, "skip", `⏩ ${player.name} ข้ามเทิร์น`);
            room.turn = nextAlive(room, room.turn);
        }
        break;
        case "โจมตี": room.attackStack += 2; room.turn = nextAlive(room, room.turn); break;
        case "สับไพ่": room.deck = shuffle(room.deck); break;
        case "ดูอนาคต": io.to(player.socketId).emit("futureCards", room.deck.slice(-3).reverse()); break;
        case "เปลี่ยนอนาคต": io.to(player.socketId).emit("reorderFuture", room.deck.slice(-3).reverse()); return;
        // ใน resolvePendingAction ภายใน switch(card)
case "COMBO_5": {
    const requestedCard = room.pendingAction.requestedCard; // ใบที่เลือกจากกองทิ้ง
    const discardIndex = room.discardPile.indexOf(requestedCard);

    if (discardIndex !== -1) {
        // ดึงออกจากกองทิ้งมาให้ผู้เล่น
        const cardFromDiscard = room.discardPile.splice(discardIndex, 1)[0];
        player.hand.push(cardFromDiscard);
        pushLog(room, "system", `♻️ ${player.name} กู้ชีพการ์ด "${cardFromDiscard}" จากกองทิ้ง`);
    }
    break;
}
case "แมวขนหยิก":
case "แมวแตงโม":
case "แมวทาโก้":
case "แมวสายรุ้ง":
case "แมวมันฝรั่ง": {
    const targetId = room.pendingAction.targetClientId;
    const reqCard = room.pendingAction.requestedCard; 
    const target = room.players.find(p => p.clientId === targetId && p.alive);

    if (!target) {
        pushLog(room, "system", "❌ ไม่พบเป้าหมาย หรือเป้าหมายออกไปแล้ว");
        break;
    }
    if (target.hand.length === 0) {
        pushLog(room, "system", `❌ ${target.name} ไม่มีไพ่ในมือให้ขโมย!`);
        break;
    }

    if (reqCard) { // กรณี Combo 3 ใบ (ระบุชื่อ)
        const cardIndex = target.hand.indexOf(reqCard);
        if (cardIndex !== -1) {
            const stolen = target.hand.splice(cardIndex, 1)[0];
            player.hand.push(stolen);
            pushLog(room, "steal", `👑 ${player.name} ขโมย "${stolen}" จาก ${target.name} สำเร็จ!`);
        } else {
            pushLog(room, "steal", `❌ ${player.name} พยายามขโมย "${reqCard}" แต่ ${target.name} ไม่มี`);
        }
    } else { // กรณี Combo 2 ใบ (สุ่ม)
        const randIdx = Math.floor(Math.random() * target.hand.length);
        const stolen = target.hand.splice(randIdx, 1)[0];
        player.hand.push(stolen);
        pushLog(room, "steal", `😼 ${player.name} สุ่มขโมยไพ่จาก ${target.name} ได้ "${stolen}"`);
    }
    break;
}
    }
    room.pendingAction = null;
    io.to(code).emit("state", room);
}

function handleAfterDraw(room, player) {
    if (room.attackStack > 0) {
        room.attackStack--;
        if (room.attackStack === 0) {
            room.turn = nextAlive(room, room.turn);
        }
    } else {
        room.turn = nextAlive(room, room.turn);
    }
}
server.listen(3000, () => console.log("🚀 RUNNING http://localhost:3000"));