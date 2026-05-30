import type { Server } from "socket.io";

export function setupSocketHandlers(io: Server): void {
  io.on("connection", (socket) => {
    console.log(`[Socket.io] Cliente conectado: ${socket.id}`);

    socket.on("join:business", (businessId: string) => {
      socket.join(`business:${businessId}`);
      console.log(`[Socket.io] ${socket.id} unido a business:${businessId}`);
    });

    socket.on("leave:business", (businessId: string) => {
      socket.leave(`business:${businessId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
    });
  });
}
