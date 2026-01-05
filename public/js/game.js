const params = new URLSearchParams(location.search);
const room = params.get("room");

const clientId = localStorage.getItem("clientId");
const playerName = sessionStorage.getItem("playerName");

// ตรวจสอบข้อมูลเบื้องต้น
if (!room || !clientId || !playerName) {
    alert("ข้อมูลไม่ครบถ้วน กำลังกลับหน้าหลัก...");
    location.href = "/";
}

let selectedCardsIdx = [];
let lastState = null; // 🚩 เพิ่มเพื่อเก็บสถานะล่าสุดไว้ใช้ในปุ่ม Confirm
/* ===== DOM ELEMENTS ===== */
const roomCodeEl = document.getElementById("roomCode");
const playersEl = document.getElementById("players");
const startBtn = document.getElementById("startGame");
const drawBtn = document.getElementById("draw");
const handEl = document.getElementById("hand");
const deckEl = document.getElementById("deckCount");
const nopeBtn = document.getElementById("nopeBtn");
const nopeCountdownEl = document.getElementById("nopeCountdown");
const logEl = document.getElementById("gameLog");

// แสดงรหัสห้อง
roomCodeEl.innerText = "รหัสห้อง: " + room;

/* ===== SOCKET CONNECTION ===== */
// เข้าร่วมห้องทันทีที่โหลดหน้า
socket.emit("joinRoom", {
    code: room,
    name: playerName,
    clientId
});

/* ===== BUTTON ACTIONS ===== */
drawBtn.onclick = () => socket.emit("drawCard", room);
startBtn.onclick = () => socket.emit("startGame", room);
nopeBtn.onclick = () => socket.emit("playNope", room);

/* ===== NOPE TIMER LOGIC ===== */
let nopeInterval = null;
function startNopeCountdown(endAt) {
    clearInterval(nopeInterval);
    nopeInterval = setInterval(() => {
        const remain = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        if (remain <= 0) {
            clearInterval(nopeInterval);
            nopeCountdownEl.innerText = "";
        } else {
            nopeCountdownEl.innerText = `⏳ รอ Nope: ${remain} วิ`;
        }
    }, 100); // อัปเดตทุก 0.1 วิ เพื่อความลื่นไหล
}
socket.on("shakeScreen", () => {
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 500);
});

/* ===== MAIN STATE LISTENER ===== */
socket.on("state", roomState => {
 
    if (!roomState) return;
    lastState = roomState; // 🚩 อัปเดตสถานะ
    renderHand(roomState); // 🚩 เรียกใช้ฟังก์ชันวาดมือแยกออกมา
  validateSelection(roomState);
    // 1. ตรวจสอบสถานะ Host
    const isHost = roomState.hostClientId === clientId;
    startBtn.style.display = (isHost && !roomState.started) ? "inline-block" : "none";

    // 2. แสดงรายชื่อผู้เล่น
    playersEl.innerHTML = "ผู้เล่น: " + roomState.players.map(p => {
        let nameTag = p.name;
        if (!p.alive) nameTag = `<span style="text-decoration:line-through; color:gray;">☠️ ${p.name}</span>`;
        if (p.clientId === roomState.hostClientId) nameTag = "👑 " + nameTag;
        return nameTag;
    }).join(" , ");

    // 3. ตรวจสอบว่าเกมเริ่มหรือยัง
    if (!roomState.started) {
        drawBtn.disabled = true;
        handEl.innerHTML = isHost ? "<b>กดเริ่มเกมได้เลย!</b>" : "<b>รอ Host เริ่มเกม...</b>";
        return;
    }

    // 4. ข้อมูลเทิร์นปัจจุบัน
    const currentPlayer = roomState.players[roomState.turn];
    const isMyTurn = currentPlayer.clientId === clientId;
    const me = roomState.players.find(p => p.clientId === clientId);

    // 5. กรณีผู้เล่นตาย
    if (!me || !me.alive) {
        handEl.innerHTML = "<h3 style='color:red;'>💀 คุณแพ้แล้ว (สถานะสังเกตการณ์)</h3>";
        drawBtn.disabled = true;
        drawBtn.innerText = "คุณตายแล้ว";
        return;
    }

    // 6. ข้อมูลกองไพ่
    deckEl.innerText = `🂠 ไพ่ในกองเหลือ: ${roomState.deck.length} ใบ`;

    // 7. จัดการระบบ NOPE
    if (roomState.pendingAction) {
        // เงื่อนไขโชว์ปุ่ม Nope: มีการ์ดม่ายในมือ + ไม่ใช่คนใช้การ์ดใบนั้นเอง
        const hasNope = me.hand.includes("ม่าย");
        const isNotMyAction = roomState.pendingAction.playerClientId !== clientId;
        nopeBtn.style.display = (hasNope && isNotMyAction) ? "inline-block" : "none";
        
        startNopeCountdown(roomState.pendingAction.endAt);
    } else {
        nopeBtn.style.display = "none";
        nopeCountdownEl.innerText = "";
        clearInterval(nopeInterval);
    }

  renderHand(roomState); // 🚩 เรียกใช้ฟังก์ชันวาดมือแยกออกมา
  validateSelection(roomState);
  
  
document.getElementById("confirmPlay").onclick = () => {
    const me = lastState.players.find(p => p.clientId === clientId);
    const selectedNames = selectedCardsIdx.map(idx => me.hand[idx]);
    const count = selectedNames.length;

    if (count === 1) {
        socket.emit("playCard", { code: room, card: selectedNames[0] });
        selectedCardsIdx = [];
        renderHand(lastState);
    } 
    else if (count === 2) {
        showTargetSelector("😼 เลือกคนที่จะสุ่มขโมย", (targetId) => {
            socket.emit("playCard", { code: room, card: selectedNames[0], targetClientId: targetId, useCount: 2 });
            selectedCardsIdx = [];
            renderHand(lastState);
        });
    } 
    else if (count === 3) {
        showTargetSelector("👑 เลือกเป้าหมายที่จะขโมย", (targetId) => {
            showCardTypePicker(targetId, selectedNames);
        });
    } 
    else if (count === 5) {
        // 🚩 เรียกใช้ฟังก์ชันที่สร้างใหม่
        showDiscardPicker(selectedNames);
    }
};

    // 9. ปุ่มจั่วไพ่
    drawBtn.disabled = !isMyTurn || !!roomState.pendingAction || !!roomState.pendingBomb;
    if (isMyTurn) {
        drawBtn.innerText = roomState.attackStack > 0 
            ? `🔥 ต้องจั่วอีก (${roomState.attackStack})` 
            : "🃏 จั่วการ์ด";
    } else {
        drawBtn.innerText = `⏳ ตาของ ${currentPlayer.name}`;
    }

    // 10. แสดง Logs
    logEl.innerHTML = "";
    roomState.logs.forEach(l => {
        const div = document.createElement("div");
        div.className = `log log-${l.kind}`;
        div.innerText = `[${l.time}] ${l.text}`;
        logEl.appendChild(div);
    });
    logEl.scrollTop = logEl.scrollHeight;
});
function renderHand(roomState) {
    const me = roomState.players.find(p => p.clientId === clientId);
    if (!me || !me.alive) return;

    handEl.innerHTML = ""; // ล้างข้อมูลเก่าก่อนวาดใหม่
    const currentPlayer = roomState.players[roomState.turn];
    const isMyTurn = currentPlayer.clientId === clientId;

    me.hand.forEach((card, index) => {
        const btn = document.createElement("button");
        btn.className = "card-button";
        
        // ใส่ Class 'selected' ถ้าการ์ดใบนี้ถูกเลือกอยู่
        if (selectedCardsIdx.includes(index)) {
            btn.classList.add("selected");
        }

        // วาดรูปการ์ด (ใส่ Path ให้ถูกต้อง)
        btn.innerHTML = `
            <img src="/assets/cards/${card}.png" 
                 onerror="this.src='/assets/cards/default.png'" 
                 style="width:70px; display:block; margin: 0 auto;">
            <div style="font-size:11px; margin-top:5px; text-align:center;">${card}</div>
        `;

        // ปุ่มจะกดเลือกได้ "เฉพาะในตาตัวเอง" และ "ไม่มี Action ค้างอยู่"
        btn.onclick = () => {
            if (!isMyTurn || roomState.pendingAction) {
                // ถ้าไม่ใช่ตาเรา ให้กดไม่ได้ หรืออาจจะใส่ alert บอก
                return; 
            }

            const sIdx = selectedCardsIdx.indexOf(index);
            if (sIdx > -1) selectedCardsIdx.splice(sIdx, 1);
            else selectedCardsIdx.push(index);

            // วาดใหม่ทันทีเมื่อกดเลือก เพื่ออัปเดต Class 'selected' (ทำให้การ์ดยกตัวขึ้น)
            renderHand(roomState); 
            validateSelection(roomState);
        };
        
        handEl.appendChild(btn);
    });
}
/* ===== EVENT LISTENERS จาก SERVER ===== */

// ดูอนาคต
socket.on("futureCards", cards => {
    alert("🔮 ไพ่ 3 ใบจากบนสุด (จั่วก่อนอยู่บน):\n\n" + cards.join("\n"));
});

// ใส่ระเบิดกลับคืนกอง
socket.on("chooseBombPosition", max => {
    let pos = prompt(`💣 ระเบิด! เลือกตำแหน่งวางคืน (0:บนสุด, ${max}:ล่างสุด)`, "0");
    pos = parseInt(pos);
    if (isNaN(pos)) pos = 0;
    socket.emit("placeBomb", { code: room, position: pos });
});

// เรียงไพ่ใหม่ (เปลี่ยนอนาคต)
socket.on("reorderFuture", (cards) => {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
        <h3>🔮 เปลี่ยนอนาคต (ลากเพื่อเรียงลำดับ)</h3>
        <p>ใบซ้ายสุด = ใบที่จะจั่วเป็นใบถัดไป</p>
        <ul id="sortableList" style="list-style:none; display:flex; gap:10px; padding:0;">
            ${cards.map((card, i) => `
                <li draggable="true" data-name="${card}" class="card-button" style="background:#eee;">
                    ${card}
                </li>
            `).join('')}
        </ul>
        <button id="saveFuture" style="margin-top:20px;">ยืนยันลำดับ</button>
    `;
    document.body.appendChild(modal);

    // Logic การลากสลับ (พื้นฐาน)
    let draggedItem = null;
    const list = document.getElementById("sortableList");

    list.addEventListener('dragstart', (e) => {
        draggedItem = e.target;
        e.target.style.opacity = '0.5';
    });

    list.addEventListener('dragover', (e) => e.preventDefault());

    list.addEventListener('drop', (e) => {
        e.preventDefault();
        const target = e.target.closest('li');
        if (target && target !== draggedItem) {
            const allItems = [...list.querySelectorAll('li')];
            const draggedIdx = allItems.indexOf(draggedItem);
            const targetIdx = allItems.indexOf(target);
            
            if (draggedIdx < targetIdx) list.insertBefore(draggedItem, target.nextSibling);
            else list.insertBefore(draggedItem, target);
        }
    });

    list.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
    });

    document.getElementById("saveFuture").onclick = () => {
        const newOrder = [...list.querySelectorAll('li')].map(li => li.dataset.name);
        socket.emit("submitFutureOrder", { code: room, order: newOrder });
        document.body.removeChild(modal);
    };
});

function validateSelection(roomState) {
    const me = roomState.players.find(p => p.clientId === clientId);
    const selectedNames = selectedCardsIdx.map(idx => me.hand[idx]);
    const confirmBtn = document.getElementById("confirmPlay");
    confirmBtn.classList.remove("hidden"); // ให้โชว์ปุ่มเมื่อมีการเลือกไพ่
    
    // 1. ถ้าไม่ได้เลือกอะไรเลย
    if (selectedNames.length === 0) {
        confirmBtn.classList.add("hidden");
        return { valid: false };
    }

    confirmBtn.classList.remove("hidden");
    const count = selectedNames.length;
    const uniqueNames = [...new Set(selectedNames)];

    // 2. เช็คคอมโบ 1 ใบ (การ์ด Action ทั่วไป)
    if (count === 1) {
        if (selectedNames[0].startsWith("แมว")) {
            confirmBtn.innerText = "❌ ต้องใช้แมวเป็นคู่";
            confirmBtn.disabled = true;
        } else {
            confirmBtn.innerText = `✅ ใช้ ${selectedNames[0]}`;
            confirmBtn.disabled = false;
        }
    } 
    // 3. เช็คคอมโบ 2 ใบ (แมวเหมือนกัน 2 ใบ)
    else if (count === 2) {
        if (uniqueNames.length === 1 && selectedNames[0].startsWith("แมว")) {
            confirmBtn.innerText = "😼 Combo 2 ใบ (สุ่มขโมย)";
            confirmBtn.disabled = false;
        } else {
            confirmBtn.innerText = "❌ ต้องเป็นแมวชนิดเดียวกัน 2 ใบ";
            confirmBtn.disabled = true;
        }
    }
    // 4. เช็คคอมโบ 3 ใบ (แมวเหมือนกัน 3 ใบ)
    else if (count === 3) {
        if (uniqueNames.length === 1 && selectedNames[0].startsWith("แมว")) {
            confirmBtn.innerText = "👑 Combo 3 ใบ (ระบุของ)";
            confirmBtn.disabled = false;
        } else {
            confirmBtn.innerText = "❌ ต้องเป็นแมวชนิดเดียวกัน 3 ใบ";
            confirmBtn.disabled = true;
        }
    }
    // 5. เช็คคอมโบ 5 ใบ (ไม่ซ้ำกันเลย 5 ชนิด)
    else if (count === 5) {
        if (uniqueNames.length === 5) {
            confirmBtn.innerText = "♻️ Combo 5 ใบ (กู้ชีพจากกองทิ้ง)";
            confirmBtn.disabled = false;
        } else {
            confirmBtn.innerText = "❌ ต้องเป็นไพ่ไม่ซ้ำกัน 5 ชนิด";
            confirmBtn.disabled = true;
        }
    }
    // 6. กรณีอื่นๆ
    else {
        confirmBtn.innerText = "❌ คอมโบไม่ถูกต้อง";
        confirmBtn.disabled = true;
    }
}
// เพิ่มฟังก์ชันใหม่ใน Game.js สำหรับเช็คคอมโบ 5 ใบ
function checkFiveCardsCombo() {
    // ดึงรายชื่อการ์ดที่ไม่ซ้ำกันในมือ
    const uniqueCards = [...new Set(me.hand)];
    
    if (uniqueCards.length < 5) {
        alert("ต้องมีไพ่ที่ไม่ซ้ำกันอย่างน้อย 5 ชนิด!");
        return;
    }

    // ให้ผู้เล่นเลือก 5 ใบ
    const list = uniqueCards.map((c, i) => `${i}: ${c}`).join("\n");
    const input = prompt(`เลือก 5 ใบที่ไม่ซ้ำกัน (ใส่เลขตำแหน่ง เช่น: 0,1,2,3,4):\n${list}`);
    if (!input) return;

    const selectedIdx = input.split(",").map(n => parseInt(n.trim()));
    if (selectedIdx.length !== 5) return alert("ต้องเลือก 5 ใบพอดี!");

    const selectedCards = selectedIdx.map(i => uniqueCards[i]);
    
    // ถามการ์ดที่อยากได้จากกองทิ้ง
    if (roomState.discardPile.length === 0) return alert("กองทิ้งยังไม่มีไพ่!");
    const discardList = [...new Set(roomState.discardPile)].join(", ");
    const getCard = prompt(`เลือกไพ่ 1 ใบจากกองทิ้ง:\n(${discardList})`);

    if (getCard && roomState.discardPile.includes(getCard)) {
        socket.emit("playFiveCombo", {
            code: room,
            cards: selectedCards,
            requestedCard: getCard
        });
    }
}

function showTargetSelector(title, onSelect) {
    // กรองหาเพื่อนที่ยังไม่ตาย และไม่ใช่ตัวเราเอง
    const targets = lastState.players.filter(p => p.clientId !== clientId && p.alive);
    
    if (targets.length === 0) {
        alert("ไม่มีเป้าหมายให้เลือก!");
        return;
    }

    const modal = document.createElement("div");
    modal.className = "target-modal";
    
    let targetHTML = `<h3 style="margin-top:0;">${title}</h3><div class="target-list">`;
    
    targets.forEach(p => {
        targetHTML += `
            <div class="target-item" onclick="selectTarget('${p.clientId}')">
                <div class="target-avatar">👤</div>
                <div class="target-name">${p.name}</div>
            </div>
        `;
    });
    
    targetHTML += `</div><button onclick="this.parentElement.remove()" style="margin-top:20px;">ยกเลิก</button>`;
    modal.innerHTML = targetHTML;
    document.body.appendChild(modal);

    // ฟังก์ชันภายในเมื่อคลิกเลือก
    window.selectTarget = (targetId) => {
        onSelect(targetId);
        modal.remove();
    };
}
// ฟังก์ชันสำหรับ Combo 3 ใบ: เลือกเป้าหมายก่อน แล้วค่อยเลือกชื่อการ์ด
function showCardTypePicker(targetId, selectedNames) {
    // รายชื่อการ์ดทั้งหมดในเกม (ควรตรงกับชื่อใน Server)
    const allCardTypes = [
        "แก้ระเบิด", "ข้าม", "โจมตี", "จั่วจากใต้กอง", 
        "เปลี่ยนอนาคต", "สับไพ่", "ดูอนาคต", "ม่าย", 
        "แมวขนหยิก", "แมวแตงโม", "แมวทาโก้", "แมวสายรุ้ง", "แมวมันฝรั่ง"
    ];

    const modal = document.createElement("div");
    modal.className = "card-picker-modal";
    
    let html = `<h3>👑 เลือกการ์ดที่ต้องการขโมย</h3><div class="card-grid">`;
    
    allCardTypes.forEach(cardName => {
        html += `
            <div class="card-option" onclick="confirmSteal('${targetId}', '${cardName}')">
                <div style="font-size: 20px;">🃏</div>
                <div>${cardName}</div>
            </div>
        `;
    });
    
    html += `</div><button onclick="this.parentElement.remove()" style="margin-top:20px; width:100%;">ยกเลิก</button>`;
    modal.innerHTML = html;
    document.body.appendChild(modal);

    // เมื่อเลือกการ์ดที่จะขโมยได้แล้ว ส่งข้อมูลไป Server
    window.confirmSteal = (tId, reqCard) => {
        socket.emit("playCard", { 
            code: room, 
            card: selectedNames[0], // เช่น "แมวแตงโม"
            targetClientId: tId,
            useCount: 3,
            requestedCard: reqCard 
        });
        modal.remove();
        selectedCardsIdx = []; // ล้างการเลือก
        renderHand(lastState);
    };
}
function triggerExplosionEffect() {
    // 1. ใส่เอฟเฟกต์เขย่าที่ body
    document.body.classList.add("shake");
    
    // 2. สร้าง element สีแดงวาบ
    const flash = document.createElement("div");
    flash.className = "explosion-flash";
    document.body.appendChild(flash);

    // 3. ลบ Class และ Element ออกเมื่อจบ Animation (0.5 วินาที)
    setTimeout(() => {
        document.body.classList.remove("shake");
        flash.remove();
    }, 500);
}
// สร้างปุ่มพิเศษใน HTML หรือเรียกผ่าน UI
// ตัวอย่าง: <button onclick="checkFiveCardsCombo()">ใช้คอมโบ 5 ใบ</button>
function showDiscardPicker(selectedNames) {
    // 1. ดึงไพ่ที่ไม่ซ้ำกันจากกองทิ้ง
    const uniqueDiscard = [...new Set(lastState.discardPile)];
    
    if (uniqueDiscard.length === 0) {
        alert("❌ ไม่มีไพ่ในกองทิ้งให้กู้ชีพ!");
        return;
    }

    // 2. สร้าง Modal
    const modal = document.createElement("div");
    modal.className = "discard-modal";
    
    let html = `
        <h3 style="margin-top:0; color:#00cec9;">♻️ เลือกการ์ดที่จะกู้ชีพ</h3>
        <p style="font-size:0.9em;">(คุณกำลังจ่าย: ${selectedNames.join(', ')})</p>
        <div class="discard-grid">
    `;
    
    uniqueDiscard.forEach(cardName => {
        html += `
            <div class="discard-item" onclick="confirmFiveCombo('${cardName}')">
                <img src="/assets/cards/${cardName}.png" onerror="this.src='/assets/cards/default.png'">
                <div style="font-size:12px; margin-top:5px;">${cardName}</div>
            </div>
        `;
    });
    
    html += `</div><button onclick="this.parentElement.remove()" style="margin-top:20px; background:#ff7675; border:none; color:white; padding:8px 20px; border-radius:5px; cursor:pointer;">ยกเลิก</button>`;
    modal.innerHTML = html;
    document.body.appendChild(modal);

    // 3. ฟังก์ชันส่งข้อมูลไปยัง Server
    window.confirmFiveCombo = (requestedCard) => {
        socket.emit("playFiveCombo", { 
            code: room, 
            cards: selectedNames, 
            requestedCard: requestedCard 
        });
        
        modal.remove(); // ปิด Modal
        selectedCardsIdx = []; // ล้างการเลือกไพ่ในมือ
        renderHand(lastState); // วาดมือใหม่
        validateSelection(lastState); // ปิดปุ่มยืนยัน
    };
}
// จบเกม
socket.on("gameOver", ({ winnerName }) => {
    alert(`🎉 ยินดีด้วย! ${winnerName} เป็นผู้ชนะ!`);
    const screen = document.getElementById("gameOverScreen");
    if (screen) {
        screen.classList.remove("hidden");
        document.getElementById("gameOverTitle").innerText = `ผู้ชนะคือ ${winnerName} 👑`;
    }
});