// ===== REORDER FUTURE =====
socket.on("reorderFuture", (cards) => {
  // TODO: popup ลากเรียง
  // เมื่อเสร็จ:
  // socket.emit("submitFutureOrder", { code: room, order: cards });
});

// ===== HELP CARD =====
socket.on("choosePlayerToHelp", (requesterId) => {
  // TODO: แสดง UI ให้คนอื่นเลือกการ์ดส่งให้ requesterId
});
