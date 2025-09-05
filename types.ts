export interface Note {
  id: number;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
}
