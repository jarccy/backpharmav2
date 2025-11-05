export interface UpdatePeopleDto {
  countryId?: number;
  entityId?: number;
  isOwner?: string;
  legalRep?: string;
  name?: string;
  documentType?: number;
  documentNumber?: string;
  birthDate?: Date;
  profession?: number;
  branchRole?: number;
  corporateRole?: number;
  colegiatureNumber?: string;
  phone?: string;
  email?: string;
  language?: number;
  whatsappConsent?: string;
  emailConsent?: string;
  silenceHours?: string;
  interests?: number;
  peopleStatus?: number;
  bank?: string;
  bankCountry?: string;
  accountType?: number;
  accountNumber?: string;
  accountHolder?: string;
  fiscalHolder?: string;
  validationStatus?: number;
  confidenceLevel?: number;
  identityValidated?: string;
  collegeValidated?: string;
  emailValidated?: string;
  phoneValidated?: string;
  validatedBy?: number;
  validationDate?: Date;
  peopleState?: string;
  peoplePlan?: string;
  peopleStartDate?: Date;
  peopleEndDate?: Date;
  autoRenewal?: string;
  relation: {
    id: number;
    entityId?: number;
    pdvId?: number;
    status?: boolean;
  }
  users: { name: string } | null;
}
