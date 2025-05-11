export type AuthCredentials = {
  email: string;
  password: string;
  code?: string | null;
};

export type LoginResponse =
  | {
      _brand: 'error';
      status: 'error';
      reason?: string;
      message?: string;
    }
  | { _brand: '2fa'; status: 'pending'; reason: string; message: string }
  | {
      _brand: 'success';
      access_token: string;
      uuid: string;
      username: string;
      id: string;
      banned: boolean;
      money: number;
      role: string;
    };

export type AuthenticatedUser = {
  access_token: string;
  client_token: string;
  uuid: string;
  name: string;
  user_properties: string;
  user_info: UserInfo;
  meta: {
    online: boolean;
    type: 'AZauth';
  };
  profile: {
    skins: Skin[];
  };
};

export type UserInfo = {
  id: string;
  banned: boolean;
  money: number;
  role: string;
};

export type Skin = {
  url: string;
  base64?: string;
};
