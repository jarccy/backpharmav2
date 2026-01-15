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
  pricing: { billing: boolean; category: string; pricingModel: string; type: string };
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
export interface detailTemplateCalendar {
  name: string;
  language: string;
  componentsSend: string;
}

export interface sendMessageTask {
  number: string;
  userId: number;
  name: string;
  message: string;
  mediaUrl: string;
  file: string;
  peopleId: number;
  createdAt: string;
  template: detailTemplateCalendar;
}

//Config Whatsapp
export interface configWhatsapp {
  number: string;
  metaToken: string;
  templateCode: string;
  messageCode: string;
  timezone: string;
}
