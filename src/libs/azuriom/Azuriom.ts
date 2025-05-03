import { AuthCredentials, AuthenticatedUser, LoginResponse, Skin } from './azuriom-types';

export default class Azuriom {
  private readonly url: string;
  private readonly skinAPI: string;

  constructor(baseURL: string) {
    this.url = `${baseURL}/api/auth`;
    this.skinAPI = `${baseURL}/api/skin-api/skins`;
  }

  async login(username: string, password: string, A2F: string | null = null) {
    const body: AuthCredentials = { email: username, password, code: A2F };
    const response = await fetch(`${this.url}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const auth: LoginResponse = await response.json();

    return await this.handleAuthResponse(auth);
  }

  async verify(user: { access_token: string }) {
    const response = await fetch(`${this.url}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: user.access_token }),
    });

    const auth: LoginResponse = await response.json();

    return this.handleAuthResponse(auth);
  }

  async skin(uuid: string): Promise<Skin> {
    const url = `${this.skinAPI}/${uuid}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 404) {
        return { url };
      }

      const data = await response.arrayBuffer();

      return {
        url,
        base64: `data:image/png;base64,${Buffer.from(data).toString('base64')}`,
      };
    } catch (error) {
      console.error('Error fetching skin:', error);
      throw error;
    }
  }

  private async handleAuthResponse(auth: LoginResponse): Promise<{
    status: 'error' | 'pending' | 'success';
    a2f: boolean;
    reason?: string;
    message?: string;
    account?: AuthenticatedUser;
  }> {
    if ('status' in auth && auth.status === 'pending') {
      return {
        status: 'pending',
        a2f: true,
        reason: auth.reason,
        message: auth.message,
        account: undefined,
      };
    }

    if ('status' in auth && auth.status === 'error') {
      return {
        status: 'error',
        a2f: false,
        reason: auth.reason,
        message: auth.message,
        account: undefined,
      };
    }

    return {
      status: 'success',
      a2f: false,
      reason: undefined,
      message: undefined,
      account: {
        id: auth.id,
        access_token: auth.access_token,
        uuid: auth.uuid,
        username: auth.username,
        banned: auth.banned,
        money: auth.money,
        role: auth.role,
        profile: {
          skins: [await this.skin(auth.id)],
        },
      },
    };
  }
}
