import * as fs from 'fs';
import * as path from 'path';

interface message {
  id: string;
  type: string;
  text: string;
  mediaId: string;
  timestamp: string;
}

const fieldMap: Record<string, string> = {
  text: "text",
  image: "image",
  video: "video",
  audio: "audio",
  document: "document",
};

export const SaveImage = async (file: string, dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const fileName = `${uniqueSuffix}.jpg`;
  const filePath = path.join(dirPath, fileName);
  fs.writeFileSync(filePath, file, 'base64');

  return `${process.env.BASE_URL}/${filePath}`;
};


export const parseMessage = (message: any): message => {
  if (!message) return { id: "", type: "", text: "", mediaId: "", timestamp: "" };

  const field = fieldMap[message.type];
  if (!field || !message[field]) {
    return { id: message.id, type: message.type, text: "", mediaId: "", timestamp: "" };
  }

  const textValue = message.type === "text" ? message.text.body : message[field].caption || "";
  const mediaId = message.type === "text" ? "" : message[field].id;

  return {
    id: message.id,
    type: message.type,
    text: textValue,
    mediaId: mediaId,
    timestamp: message.timestamp
  };
}

export const parseContact = (contact: { profile: { name: string }, wa_id: string }): { name: string, number: string } => {
  if (!contact) return { name: "", number: "" };

  return {
    name: contact.profile.name,
    number: contact.wa_id,
  };
}