export type Chat = {
  id:         string;
  created_at: string;
};

export type ChatParticipant = {
  id:        string;
  chat_id:   string;
  user_id:   string;
  joined_at: string;        // matches DB column name
};

export type Message = {
  id:         string;
  chat_id:    string;
  sender_id:  string;
  content:    string;
  image_url:  string | null;
  created_at: string;
};

export type ChatWindow = {
  id:         string;
  user_id:    string;
  chat_id:    string;
  x:          number;
  y:          number;
  w:          number;
  h:          number;
  z_index:    number;
  minimized:  boolean;
  updated_at: string;       // matches DB column name
};
