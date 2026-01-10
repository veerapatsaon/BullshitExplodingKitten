const socket = io();
/* ===== CLIENT ID (ถาวร) ===== */
let clientId = localStorage.getItem("clientId");
if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem("clientId", clientId);
}

/* ===== DOM ===== */
const nameInput = document.getElementById("name");
const codeInput = document.getElementById("code");
const createBtn = document.getElementById("create");
const joinBtn = document.getElementById("join");

/* ===== ACTION: CREATE ===== */
createBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) return alert("กรุณาใส่ชื่อ!");
    
    socket.emit("createRoom", { name, clientId });
};

/* ===== ACTION: JOIN ===== */
joinBtn.onclick = () => {
    const name = nameInput.value.trim();
    const code = codeInput.value.trim().toUpperCase();
    if (!name || !code) return alert("ใส่ชื่อและรหัสห้องให้ครบ");

    socket.emit("joinRoom", { code, name, clientId });
};

/* ===== LISTEN FROM SERVER ===== */
// แก้ไขให้รอรับ "roomJoined" อย่างเดียว เพราะ Server ส่งชื่อนี้ทั้งตอนสร้างและตอนจอย
socket.on("roomJoined", ({ code }) => {
    const name = nameInput.value.trim();
    
    // เก็บชื่อผู้เล่นไว้เผื่อใช้แสดงผล
    sessionStorage.setItem("playerName", name); 
    
    // Redirect ไปยังหน้าเกม
    // ใช้รูปแบบเดียวกันทั้งคู่เพื่อความง่าย: ?code=...&clientId=...
    window.location.href = `/game.html?code=${code}&clientId=${clientId}`;
});