export class UpdateCalendarDto {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  timeStart: string;
  timeEnd: string | null;
  category: string;
  description: string;
  templateId?: number;
  patients?: {
    id?: number;
    patientId: string;
    namePatient: string;
    phone: string;
  }[];
  countryTime: string;
}
