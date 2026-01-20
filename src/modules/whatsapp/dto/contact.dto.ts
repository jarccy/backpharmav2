export class Contact {
  countryId?: number;
  name?: string;
  phone?: string;
  profilePicUrl?: string;
}

export class getDetailsContact {
  contactId?: number;
  number?: string;
}

export class storeDetailsContact {
  contactId?: number;
  number?: string;
  profilePicUrl?: string;
  anotherName?: string;
  about?: string;
  observation?: string;
}