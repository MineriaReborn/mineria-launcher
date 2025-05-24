export type Account = {
  access_token: string;
  client_token: string;
  uuid: string;
  name: string;
  user_properties: any;
  meta: {
    type: string;
    offline: boolean;
  };
  user_info: {
    role: string;
    monnaie: number;
  };
};
