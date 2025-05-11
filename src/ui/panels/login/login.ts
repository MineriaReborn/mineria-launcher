import { shell } from 'electron';

import { addAccount, changePanel } from '../../../utils';
import { Account } from '../../../types/account';
import { Store, StoreItem } from '../../../utils/store';
import Azuriom from '../../../libs/azuriom/Azuriom';

type LoginProps = {
  config: MineriaConfig;
};

export default class Login {
  static id: string = 'login';

  private config: MineriaConfig | null = null;
  private store: Store;

  constructor() {
    this.store = new Store();
  }

  async init(props: LoginProps) {
    this.config = props.config;
    await this.loginAzuriom();
  }

  async loginAzuriom() {
    const mailInput: HTMLInputElement = <HTMLInputElement>document.querySelector('.Mail');
    const passwordInput: HTMLInputElement = <HTMLInputElement>document.querySelector('.Password');
    const infoLogin: HTMLElement = <HTMLElement>document.querySelector('.info-login');
    const loginBtn: HTMLButtonElement = <HTMLButtonElement>document.querySelector('.login-btn');
    const oublieBtn: HTMLButtonElement = <HTMLButtonElement>(
      document.querySelector('.password-reset')
    );
    const azuriom = new Azuriom('https://mineria.fr');
    const loginBtn2f: HTMLButtonElement = <HTMLButtonElement>(
      document.querySelector('.login-btn-2f')
    );
    const a2finput: HTMLInputElement = <HTMLInputElement>document.querySelector('.A2F');
    const infoLogin2f: HTMLElement = <HTMLElement>document.querySelector('.info-login-2f');
    const cancel2f: HTMLButtonElement = <HTMLButtonElement>document.querySelector('.cancel-2f');
    const loginCard = <HTMLDivElement>document.querySelector('.login-card');
    const cardBase = <HTMLDivElement>document.querySelector('.card-base');
    const a2fCard = <HTMLDivElement>document.querySelector('.a2f-card');

    // Email focus and blur
    mailInput.addEventListener('focus', function () {
      if (mailInput.value === 'Adresse email') {
        mailInput.value = '';
        mailInput.style.color = '#c1c1c1';
      }
    });

    mailInput.addEventListener('blur', function () {
      if (mailInput.value === '') {
        mailInput.value = 'Adresse email';
        mailInput.style.color = '#909090';
      } else {
        mailInput.style.color = '#c1c1c1';
      }
    });

    // Password focus and blur
    passwordInput.addEventListener('focus', function () {
      if (passwordInput.value === 'Mot de passe') {
        passwordInput.value = '';
        passwordInput.style.color = '#c1c1c1';
        passwordInput.type = 'password';
      }
    });

    passwordInput.addEventListener('blur', function () {
      if (passwordInput.value === '') {
        passwordInput.value = 'Mot de passe';
        passwordInput.style.color = '#909090';
        passwordInput.type = 'text';
      } else {
        passwordInput.style.color = '#c1c1c1';
        passwordInput.type = 'password';
      }
    });

    // 2FA focus and blur
    a2finput.addEventListener('focus', function () {
      if (a2finput.value === 'Code') {
        a2finput.value = '';
        a2finput.style.color = '#c1c1c1';
      }
    });

    a2finput.addEventListener('blur', function () {
      if (a2finput.value === '') {
        a2finput.value = 'Code';
        a2finput.style.color = '#909090';
      } else {
        a2finput.style.color = '#c1c1c1';
      }
    });

    // Password reset button
    oublieBtn.addEventListener('click', async () => {
      await shell.openExternal('https://mineria.fr/user/password/reset');
    });

    // Cancel 2FA and reset form
    cancel2f.addEventListener('click', () => {
      if (!loginCard || !cardBase || !a2fCard) return;
      loginCard.style.display = 'block';
      cardBase.style.display = 'block';
      a2fCard.style.display = 'none';
      a2finput.value = 'Code';
      loginBtn.disabled = false;
      mailInput.disabled = false;
      passwordInput.disabled = false;
      loginBtn.style.display = 'block';
      infoLogin.innerHTML = '&nbsp;';
      mailInput.value = 'Adresse email';
      passwordInput.value = 'Mot de passe';
      passwordInput.type = 'text';
      a2finput.style.color = '#909090';
      mailInput.style.color = '#909090';
      passwordInput.style.color = '#909090';
    });

    // Handle 2FA login
    loginBtn2f.addEventListener('click', async () => {
      if (a2finput.value === '') {
        infoLogin2f.innerHTML = 'Entrez votre code a2f';
        return;
      }

      try {
        const loginResponse = await azuriom.login(
          mailInput.value,
          passwordInput.value,
          a2finput.value,
        );

        if (!loginResponse?.account || loginResponse?.message) {
          infoLogin2f.innerHTML = 'Code a2f invalide';
          return;
        }

        const account: Account = {
          access_token: loginResponse.account.access_token,
          client_token: loginResponse.account.uuid,
          uuid: loginResponse.account.uuid,
          name: loginResponse.account.name,
          user_properties: loginResponse.account.user_properties,
          meta: {
            type: loginResponse.account.meta?.type ?? '',
            offline: true,
          },
          user_info: {
            role: loginResponse.account.user_info?.role,
            monnaie: loginResponse.account.user_info?.money,
          },
        };

        this.store.upsert(StoreItem.Account, account);

        addAccount(account);
        changePanel('home');

        // Reset UI
        a2finput.value = 'Code';
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        loginBtn.style.display = 'block';
        infoLogin.innerHTML = '&nbsp;';
        mailInput.value = 'Adresse email';
        passwordInput.value = 'Mot de passe';
        passwordInput.type = 'text';
        mailInput.style.color = '#909090';
        passwordInput.style.color = '#909090';
        a2finput.style.color = '#909090';

        if (!loginCard || !cardBase || !a2fCard) return;
        loginCard.style.display = 'block';
        cardBase.style.display = 'block';
        a2fCard.style.display = 'none';
      } catch (err) {
        console.log(err);
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        infoLogin.innerHTML = 'Code a2f invalide';
      }
    });

    // Normal login
    loginBtn.addEventListener('click', async () => {
      if (mailInput.value === '' || mailInput.value === 'Adresse email') {
        infoLogin.innerHTML = "Entrez votre adresse email / Nom d'utilisateur";
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        return;
      }
      if (passwordInput.value === '' || passwordInput.value === 'Mot de passe') {
        infoLogin.innerHTML = 'Entrez votre mot de passe';
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        return;
      }
      try {
        const loginResponse = await azuriom.login(mailInput.value, passwordInput.value);

        if (
          loginResponse?.account &&
          this.config?.whitelist &&
          !this.config?.whitelist.includes(loginResponse.account.name)
        ) {
          loginBtn.disabled = false;
          mailInput.disabled = false;
          passwordInput.disabled = false;
          infoLogin.innerHTML = "Vous n'êtes pas whitelisté";
          return;
        }

        if (loginResponse.reason === 'user_banned') {
          loginBtn.disabled = false;
          mailInput.disabled = false;
          passwordInput.disabled = false;
          infoLogin.innerHTML = 'Votre compte est banni';
          return;
        }

        if (loginResponse.a2f && a2fCard && cardBase) {
          console.log('2FA activé');
          a2fCard.style.display = 'block';
          cardBase.style.display = 'none';
          return;
        }

        if (!loginResponse.account) {
          loginBtn.disabled = false;
          mailInput.disabled = false;
          passwordInput.disabled = false;
          infoLogin.innerHTML = "Une erreur s'est produite";
          return;
        }

        const account: Account = {
          access_token: loginResponse.account.access_token,
          client_token: loginResponse.account.uuid,
          uuid: loginResponse.account.uuid,
          name: loginResponse.account.name,
          user_properties: loginResponse.account.user_properties,
          meta: {
            type: loginResponse.account.meta?.type ?? '',
            offline: true,
          },
          user_info: {
            role: loginResponse.account.user_info?.role,
            monnaie: loginResponse.account.user_info?.money,
          },
        };

        this.store.upsert(StoreItem.Account, account);
        addAccount(account);
        changePanel('home');

        // Reset UI
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        loginBtn.style.display = 'block';
        infoLogin.innerHTML = '&nbsp;';
        mailInput.value = 'Adresse email';
        passwordInput.value = 'Mot de passe';
        passwordInput.type = 'text';
        mailInput.style.color = '#909090';
        passwordInput.style.color = '#909090';
      } catch (err) {
        console.log(err);
        loginBtn.disabled = false;
        mailInput.disabled = false;
        passwordInput.disabled = false;
        infoLogin.innerHTML = 'Adresse E-mail ou mot de passe invalide';
      }
    });
  }
}
