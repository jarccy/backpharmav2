// import { IsBoolean, IsNumber, IsString } from 'class-validator';

//Store Message
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

//Update Message
export interface UpdateMessage {
  messageId: string;
  number: string;
  timestamp: string;
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

export interface detailTemplateCalendar {
  templateId: string;
  name: string;
  language: string;
  components: string;
}

//Send Message
export interface SendMessage {
  temporalId: string;
  peopleId: number;
  number: string;
  message: string;
  mediaType?: string;
  file?: string | null;
  createdAt: string;
  template: string | null;
}

//Send Message Task
export interface sendMessageTask {
  number: string;
  userId: number;
  name: string;
  language: string;
  message: string;
  componentsSend: string;
  mediaUrl?: string;
  peopleId: number;
  createdAt: string;
  template: detailTemplate;
}
