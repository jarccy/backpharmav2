export class StoreCalendarDto {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  category: string;
  timeStart: string;
  timeEnd: string | null;
  templateId?: number;
  patients?: {
    id?: number;
    patientId: string;
    namePatient: string;
    phone: string;
  }[];
  countryTime: string;
}
