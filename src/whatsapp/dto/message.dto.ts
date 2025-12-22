// import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class StoreMessage {
  messageId: string;
  timestamp: string;
  body: string;
  mediaType: string;
  mediaUrl?: string;
  isDelete?: number;

  number: string;
  name: string;

  mediaId?: string;
}

export interface UpdateMessage {
  messageId: string;
  number: string;
  timestamp: string;
  read: number;
  status: string;
  isDelete: number;
}

type componentType = 'header' | 'body' | 'footer';
type paramType = 'image' | 'video' | 'file' | 'document' | 'text';

export interface detailTemplate {
  templateId: string;
  name: string;
  language: string;
  components: {
    type: componentType;
    parameters: {
      type: paramType;
      text?: string;
      image?: { link: string };
      video?: { link: string };
      file?: { link: string };
      document?: { link: string };
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
