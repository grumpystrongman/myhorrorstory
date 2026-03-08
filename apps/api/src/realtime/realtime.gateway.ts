import type {
  OnGatewayConnection} from '@nestjs/websockets';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/session', cors: true })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    client.emit('session.joined', {
      connectedAt: new Date().toISOString()
    });
  }

  @SubscribeMessage('host.command')
  onHostCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: Record<string, unknown>
  ): void {
    client.broadcast.emit('host.command', payload);
  }

  @SubscribeMessage('gm.narration')
  onNarration(@MessageBody() payload: Record<string, unknown>): void {
    this.server.emit('gm.narration', payload);
  }
}
