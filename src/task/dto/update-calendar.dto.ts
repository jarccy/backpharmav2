export class UpdateCalendarDto {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  timeStart: string;
  timeEnd: string | null;
  category: string;
  description: string;
  patients: {
    id: string;
    name: string;
    number: string;
  }[];
}
