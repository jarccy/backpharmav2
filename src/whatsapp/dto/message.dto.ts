// import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class StoreMessage {
  messageId: string;
  body: string;
  ack?: number;
  read: number;
  mediaType: string;
  mediaUrl?: string;
  fromMe: number;
  isDelete?: number;
  peopleId: number;
}

export interface detailTemplate {
  templateId: string;
  name: string;
  language: string;
  components: {
    type: string;
    parameters: {
      type: string;
      text: string;
    }[];
  }[] | null;
}

export interface SendMessage {
  peopleId: number;
  number: string;
  message: string;
  mediaType?: string;
  file?: string | null;
  template: string | null;
}


export interface sendMessageTask {
  number: string;
  message: string;
  mediaType: string;
  peopleId: number;
}
