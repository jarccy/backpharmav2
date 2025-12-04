// import { IsBoolean, IsNumber, IsString } from 'class-validator';

// export class StoreMessage {
//   body: string;
//   ack?: number;
//   read: number;
//   mediaType: string;
//   mediaUrl?: string;
//   fromMe: number;
//   isDelete?: number;
//   peopleId: number;
//   whatsappId: number;
// }

export interface SendMessage {
  peopleId: number;
  number: string;
  message: string;
  mediaType?: string;
  file?: string | null;
}

export interface sendMessageTask {
  number: string;
  message: string;
  mediaType: string;
  peopleId: number;
}
