// import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class Message {
  body: string;
  ack?: number;
  read: number;
  mediaType: string;
  mediaUrl?: string;
  fromMe: number;
  isDelete?: number;
  peopleId: number;
  whatsappId: number;
}

export interface StoreMessage {
  peopleId: number;
  number: string;
  message: string;
  mediaType?: string;
  mediaUrl?: string;
  read?: string;
  whatsappId: number;
}

export interface StoreManyMessage {
  templateId: string;
  patients: {
    patientId: string;
    number: string;
    name: string;
  }[];
}

export interface sendMessageTask {
  number: string;
  message: string;
  mediaType: string;
  peopleId: number;
}
