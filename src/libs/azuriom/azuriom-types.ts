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
  | ({
      _brand: 'success';
    } & AuthenticatedUser);

export type AuthenticatedUser = {
  id: string;
  access_token: string;
  uuid: string;
  username: string;
  banned: boolean;
  money: number;
  role: {
    name: string;
    color: string;
  };
  profile: {
    skins: Skin[];
  };
};

export type Skin = {
  url: string;
  base64?: string;
};
