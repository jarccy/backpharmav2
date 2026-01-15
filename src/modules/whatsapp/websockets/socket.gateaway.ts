import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class WhatsappGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  constructor() { }

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id} `);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnect: ${client.id} `);
  }

  // ConnectedSocket,
  // MessageBody,
  // @SubscribeMessage('sendTest')
  // handleMessage(client: Socket, message: string): void {
  //   console.log(`Mensaje recibido : ${message}`);
  //   this.server.emit('newMessage', message);
  // }

  emitEvent(event: string, message: any): void {
    this.server.emit(event, message);
  }
}
