
/* ===== CLIENT ID (ถาวร) ===== */
let clientId = localStorage.getItem("clientId");
if (!clientId) {
  clientId = crypto.randomUUID();
  localStorage.setItem("clientId", clientId);
}
console.log("CLIENT ID =", clientId);

/* ===== DOM ===== */
const nameInput = document.getElementById("name");
const codeInput = document.getElementById("code");
const createBtn = document.getElementById("create");
const joinBtn = document.getElementById("join");

/* ===== CREATE ROOM ===== */
createBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) return alert("ใส่ชื่อก่อน");

  console.log("🏠 CREATE ROOM REQ:", name, clientId);

  socket.emit("createRoom", {
    name,
    clientId
  });
};

/* ===== JOIN ROOM ===== */
joinBtn.onclick = () => {
  const name = nameInput.value.trim();
  const code = codeInput.value.trim().toUpperCase();

  if (!name || !code)
    return alert("ใส่ชื่อและรหัสห้องให้ครบ");

  socket.emit("joinRoom", {
    code,
    name,
    clientId
  });
};

// ในหน้า Lobby (ก่อนเข้า game.html)
socket.on("roomJoined", ({ code }) => {
  // เก็บข้อมูลลง Session/Local Storage เพื่อนำไปใช้ต่อในหน้า game.html
  sessionStorage.setItem("playerName", nameInput.value); 
  // Redirect ไปยังหน้าเกม พร้อมแนบ Parameter รหัสห้อง
  window.location.href = `/game.html?room=${code}`;
});

