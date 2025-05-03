import { shell } from 'electron';
import { addAccount, changePanel } from '../../../utils';
import { Account } from '../../../types/account';
import { Store, StoreItem } from '../../../utils/store';
import Azuriom from '../../../libs/azuriom/Azuriom';

type InputWithPlaceholder = {
  element: HTMLInputElement;
  placeholder: string;
  isPassword?: boolean;
};

export default class Login {
  static id = 'login';
  private store = new Store();
  private azuriom = new Azuriom('https://mineria.fr');

  async init() {
    await this.setupLoginUI();
  }

  private setupInputPlaceholder({ element, placeholder, isPassword }: InputWithPlaceholder) {
    element.addEventListener('focus', () => {
      if (element.value === placeholder) {
        element.value = '';
        element.style.color = '#c1c1c1';
        if (isPassword) element.type = 'password';
      }
    });

    element.addEventListener('blur', () => {
      if (element.value === '') {
        element.value = placeholder;
        element.style.color = '#909090';
        if (isPassword) element.type = 'text';
      } else {
        element.style.color = '#c1c1c1';
        if (isPassword) element.type = 'password';
      }
    });
  }

  private getElements() {
    return {
      mailInput: document.querySelector('.Mail') as HTMLInputElement,
      passwordInput: document.querySelector('.Password') as HTMLInputElement,
      a2fInput: document.querySelector('.A2F') as HTMLInputElement,
      infoLogin: document.querySelector('.info-login') as HTMLElement,
      infoLogin2f: document.querySelector('.info-login-2f') as HTMLElement,
      loginBtn: document.querySelector('.login-btn') as HTMLButtonElement,
      loginBtn2f: document.querySelector('.login-btn-2f') as HTMLButtonElement,
      oublieBtn: document.querySelector('.password-reset') as HTMLButtonElement,
      cancel2f: document.querySelector('.cancel-2f') as HTMLButtonElement,
      loginCard: document.querySelector('.login-card') as HTMLDivElement,
      cardBase: document.querySelector('.card-base') as HTMLDivElement,
      a2fCard: document.querySelector('.a2f-card') as HTMLDivElement,
    };
  }

  private resetLogin(inputs: {
    mailInput: HTMLInputElement;
    passwordInput: HTMLInputElement;
    loginBtn: HTMLButtonElement;
  }) {
    const { mailInput, passwordInput, loginBtn } = inputs;
    loginBtn.disabled = false;
    mailInput.disabled = false;
    passwordInput.disabled = false;
    loginBtn.style.display = 'block';
    mailInput.value = 'Adresse email';
    passwordInput.value = 'Mot de passe';
    passwordInput.type = 'text';
    mailInput.style.color = '#909090';
    passwordInput.style.color = '#909090';
  }

  private reset2FA(elements: ReturnType<typeof this.getElements>) {
    elements.a2fInput.value = 'Code';
    elements.a2fInput.style.color = '#909090';
    elements.loginCard.style.display = 'block';
    elements.cardBase.style.display = 'block';
    elements.a2fCard.style.display = 'none';
    this.resetLogin(elements);
    elements.infoLogin.innerHTML = '&nbsp;';
  }

  private async setupLoginUI() {
    const elements = this.getElements();

    this.setupInputPlaceholder({ element: elements.mailInput, placeholder: 'Adresse email' });
    this.setupInputPlaceholder({
      element: elements.passwordInput,
      placeholder: 'Mot de passe',
      isPassword: true,
    });
    this.setupInputPlaceholder({ element: elements.a2fInput, placeholder: 'Code' });

    elements.oublieBtn.addEventListener('click', () =>
      shell.openExternal('https://mineria.fr/user/password/reset'),
    );

    elements.cancel2f.addEventListener('click', () => this.reset2FA(elements));

    elements.loginBtn2f.addEventListener('click', () => this.handle2FLogin(elements));
    elements.loginBtn.addEventListener('click', () => this.handleLogin(elements));
  }

  private async handleLogin(elements: ReturnType<typeof this.getElements>) {
    const { mailInput, passwordInput, loginBtn, infoLogin, a2fCard, cardBase } = elements;

    if (mailInput.value === '' || mailInput.value === 'Adresse email') {
      infoLogin.innerHTML = "Entrez votre adresse email / Nom d'utilisateur";
      return;
    }

    if (passwordInput.value === '' || passwordInput.value === 'Mot de passe') {
      infoLogin.innerHTML = 'Entrez votre mot de passe';
      return;
    }

    try {
      const loginResponse = await this.azuriom.login(mailInput.value, passwordInput.value);

      if (loginResponse.a2f && a2fCard && cardBase) {
        a2fCard.style.display = 'block';
        cardBase.style.display = 'none';
        return;
      }

      if (!loginResponse.account) {
        infoLogin.innerHTML = "Une erreur s'est produite";
        return;
      }

      if (loginResponse.account.banned) {
        infoLogin.innerHTML = 'Votre compte est banni';
        return;
      }

      this.finishLogin(loginResponse.account);
      this.resetLogin(elements);
      infoLogin.innerHTML = '&nbsp;';
    } catch (err) {
      console.error(err);
      infoLogin.innerHTML = 'Adresse E-mail ou mot de passe invalide';
    }
  }

  private async handle2FLogin(elements: ReturnType<typeof this.getElements>) {
    const { mailInput, passwordInput, a2fInput, infoLogin2f } = elements;

    if (a2fInput.value === '') {
      infoLogin2f.innerHTML = 'Entrez votre code a2f';
      return;
    }

    try {
      const loginResponse = await this.azuriom.login(
        mailInput.value,
        passwordInput.value,
        a2fInput.value,
      );

      if (!loginResponse?.account || loginResponse?.message) {
        infoLogin2f.innerHTML = 'Code a2f invalide';
        return;
      }

      this.finishLogin(loginResponse.account);
      this.reset2FA(elements);
    } catch (err) {
      console.error(err);
      infoLogin2f.innerHTML = 'Code a2f invalide';
    }
  }

  private finishLogin(account: Account) {
    this.store.upsert(StoreItem.Account, account);
    addAccount(account);
    changePanel('home');
  }
}
