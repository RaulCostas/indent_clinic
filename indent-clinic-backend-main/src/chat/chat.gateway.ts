import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*', // Allow all origins for now, constrain in production
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Track active users: socketId -> username
    private activeUsers = new Map<string, string>();

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        this.activeUsers.delete(client.id);
        this.broadcastActiveUsers();
    }

    @SubscribeMessage('join')
    handleJoin(
        @MessageBody() username: string,
        @ConnectedSocket() client: Socket,
    ): void {
        this.activeUsers.set(client.id, username);
        console.log(`User registered: ${username} (${client.id})`);
        this.broadcastActiveUsers();
    }

    @SubscribeMessage('logout')
    handleLogout(@ConnectedSocket() client: Socket): void {
        console.log(`User logged out explicitly: ${client.id}`);
        this.activeUsers.delete(client.id);
        this.broadcastActiveUsers();
    }

    private broadcastActiveUsers() {
        // Convert Map values to array
        const users = Array.from(this.activeUsers.values());
        // Remove duplicates if any (though socket ids are unique, same user might open multiple tabs)
        // Let's keep distinct names for the list
        const distinctUsers = [...new Set(users)];
        this.server.emit('activeUsers', distinctUsers);
    }

    @SubscribeMessage('sendMessage')
    handleMessage(
        @MessageBody() data: { sender: string; message: string; to?: string },
        @ConnectedSocket() client: Socket,
    ): void {
        const registeredName = this.activeUsers.get(client.id);
        const finalData = {
            ...data,
            sender: registeredName || data.sender
        };

        if (data.to) {
            // Private message
            const recipientSocketId = [...this.activeUsers.entries()]
                .find(([_, name]) => name === data.to)?.[0];

            if (recipientSocketId) {
                this.server.to(recipientSocketId).emit('receiveMessage', finalData);
                // Also send back to sender so they see their own message
                client.emit('receiveMessage', finalData);
            }
        } else {
            // Broadcast to all
            this.server.emit('receiveMessage', finalData);
        }
    }
}
