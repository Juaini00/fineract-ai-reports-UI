export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string;
}

export interface AccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface CreateApiKeyPayload {
  name: string;
  expires_at?: string | null;
  allowed_office_ids?: number[];
  allowed_capabilities?: string[];
  allow_all_offices?: boolean;
  allow_all_capabilities?: boolean;
  can_view_pii?: boolean;
}

export interface CreatedApiKey {
  id: string;
  api_key: string;
  message: string;
}
