export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Timestamped = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      ai_suggestions: Table<
        {
          accepted: boolean | null;
          created_at: string;
          created_by: string | null;
          feature: string;
          id: string;
          input_hash: string;
          model: string | null;
          project_id: string;
          provider: string;
          result: Json;
        },
        {
          accepted?: boolean | null;
          created_at?: string;
          created_by?: string | null;
          feature: string;
          id?: string;
          input_hash: string;
          model?: string | null;
          project_id: string;
          provider: string;
          result: Json;
        }
      >;
      annotation_codes: Table<
        { annotation_id: string; code_id: string; created_at: string; project_id: string },
        { annotation_id: string; code_id: string; created_at?: string; project_id: string }
      >;
      annotations: Table<
        Timestamped & {
          comment: string | null;
          end_offset: number;
          id: string;
          legacy_highlight: Json | null;
          paragraph_id: string;
          project_id: string;
          start_offset: number;
          text: string;
        },
        {
          comment?: string | null;
          created_at?: string;
          end_offset?: number;
          id?: string;
          legacy_highlight?: Json | null;
          paragraph_id: string;
          project_id: string;
          start_offset?: number;
          text: string;
          updated_at?: string;
        }
      >;
      canvases: Table<
        Timestamped & { edges: Json; id: string; name: string; nodes: Json; project_id: string; viewport: Json | null },
        { created_at?: string; edges?: Json; id?: string; name: string; nodes?: Json; project_id: string; updated_at?: string; viewport?: Json | null }
      >;
      code_groups: Table<
        Timestamped & { color: string; id: string; name: string; project_id: string; sort_order: number },
        { color?: string; created_at?: string; id?: string; name: string; project_id: string; sort_order?: number; updated_at?: string }
      >;
      codes: Table<
        Timestamped & { code_group_id: string; id: string; name: string; owner: string | null; project_id: string },
        { code_group_id: string; created_at?: string; id?: string; name: string; owner?: string | null; project_id: string; updated_at?: string }
      >;
      interviews: Table<
        Timestamped & { id: string; length: string | null; name: string; owner: string | null; participant_id: string | null; participant_name: string | null; project_id: string; sample: string | null },
        {
          created_at?: string;
          id?: string;
          length?: string | null;
          name: string;
          owner?: string | null;
          participant_id?: string | null;
          participant_name?: string | null;
          project_id: string;
          sample?: string | null;
          updated_at?: string;
        }
      >;
      outline_questions: Table<
        Timestamped & { content: string; id: string; outline_id: string; project_id: string; sort_order: number; tags: string[] },
        { content: string; created_at?: string; id?: string; outline_id: string; project_id: string; sort_order?: number; tags?: string[]; updated_at?: string }
      >;
      outlines: Table<
        Timestamped & { id: string; name: string; project_id: string },
        { created_at?: string; id?: string; name: string; project_id: string; updated_at?: string }
      >;
      paragraphs: Table<
        Timestamped & { end_time: string | null; id: string; interview_id: string; project_id: string; sort_order: number; speaker: string | null; start_time: string | null; text: string },
        {
          created_at?: string;
          end_time?: string | null;
          id?: string;
          interview_id: string;
          project_id: string;
          sort_order?: number;
          speaker?: string | null;
          start_time?: string | null;
          text: string;
          updated_at?: string;
        }
      >;
      participants: Table<
        Timestamped & {
          display_name: string;
          id: string;
          notes: string | null;
          project_id: string;
          role: string | null;
          sample_group: string | null;
          tags: string[];
        },
        {
          created_at?: string;
          display_name: string;
          id?: string;
          notes?: string | null;
          project_id: string;
          role?: string | null;
          sample_group?: string | null;
          tags?: string[];
          updated_at?: string;
        }
      >;
      profiles: Table<
        Timestamped & { avatar_url: string | null; display_name: string | null; user_id: string },
        { avatar_url?: string | null; created_at?: string; display_name?: string | null; updated_at?: string; user_id: string }
      >;
      project_members: Table<
        { created_at: string; project_id: string; role: Database["public"]["Enums"]["project_role"]; user_id: string },
        { created_at?: string; project_id: string; role?: Database["public"]["Enums"]["project_role"]; user_id: string }
      >;
      projects: Table<
        Timestamped & { created_by: string; description: string | null; id: string; name: string },
        { created_at?: string; created_by: string; description?: string | null; id?: string; name: string; updated_at?: string }
      >;
      reports: Table<
        Timestamped & { body: string; id: string; project_id: string; title: string },
        { body?: string; created_at?: string; id?: string; project_id: string; title: string; updated_at?: string }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_role: "owner" | "editor" | "viewer";
    };
    CompositeTypes: Record<string, never>;
  };
};
