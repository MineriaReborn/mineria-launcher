import { database, changePanel, addAccount } from '../utils.js';
const { Azuriom } = require('tropolia_core');
const { shell } = require('electron');
class Login {
    static id = "login";
    async init(config, news, whitelisted) {
        this.config = config
        this.whitelisted = await whitelisted
        this.database = await new database().init();
        this.loginAzuriom();
    }

    async loginAzuriom() {
        let mailInput = document.querySelector('.Mail')
        let passwordInput = document.querySelector('.Password')
        let infoLogin = document.querySelector('.info-login')
        let loginBtn = document.querySelector(".login-btn")
        let oublieBtn = document.querySelector(".password-reset")
        let azuriom = new Azuriom("https://mineria.ovh");
        let loginBtn2f = document.querySelector('.login-btn-2f');
        let a2finput = document.querySelector('.A2F');
        let infoLogin2f = document.querySelector('.info-login-2f');
        let cancel2f = document.querySelector('.cancel-2f');
        
    
        mailInput.addEventListener("focus", function () {
            if (mailInput.value == "Adresse email") {
            
            mailInput.value = "";
            mailInput.style.color = "#c1c1c1";
            }
            
        });
        mailInput.addEventListener("blur", function () {
            if (mailInput.value !== "Adresse email") {
                mailInput.style.color = "#c1c1c1";
            }
            if (mailInput.value == "") {
                mailInput.value = "Adresse email";
                mailInput.style.color = "#909090";
            }
          });

    

        passwordInput.addEventListener("focus", function () {
            if (passwordInput.value == "Mot de passe") {
            passwordInput.value = "";
            passwordInput.style.color = "#c1c1c1";
            passwordInput.type = "password";
            }
            
        });

        passwordInput.addEventListener("blur", function () {
            if (passwordInput.value !== "Mot de passe") {
                passwordInput.style.color = "#c1c1c1";
                passwordInput.type = "password";
            }
            if (passwordInput.value == "") {
                passwordInput.value = "Mot de passe";
                passwordInput.style.color = "#909090";
                passwordInput.type = "text";
            }
          });

          a2finput.addEventListener("focus", function () {
            if (a2finput.value == "Code") {
                a2finput.value = "";
                a2finput.style.color = "#c1c1c1";
            }
            
        });

        a2finput.addEventListener("blur", function () {
            if (a2finput.value !== "Code") {
                a2finput.style.color = "#c1c1c1";
            }
            if (a2finput.value == "") {
                a2finput.value = "Code";
                a2finput.style.color = "#909090";
            }
          });
        oublieBtn.addEventListener("click", async () => {
            shell.openExternal("https://mineria.ovh/user/password/reset");
        })

        

        cancel2f.addEventListener("click", () => {
            document.querySelector(".login-card").style.display = "block";
            document.querySelector(".card-base").style.display = "block";
            document.querySelector('.a2f-card').style.display = "none";
                a2finput.value = "Code"
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                loginBtn.style.display = "block";
                infoLogin.innerHTML = "&nbsp;";
                mailInput.value = "Adresse email";
                passwordInput.value = "Mot de passe";
                passwordInput.type = "text";
                a2finput.style.color = "#909090";
                mailInput.style.color = "#909090";
                passwordInput.style.color = "#909090";
        });
        loginBtn2f.addEventListener("click", async () => {
            if (a2finput.value == "") {
                infoLogin2f.innerHTML = "Entrez votre code a2f";
                return;
            }

            await azuriom.login(mailInput.value, passwordInput.value, a2finput.value).then(async account_connect => {
                console.log(account_connect);
                if (account_connect.error) {
                    infoLogin2f.innerHTML = 'Code a2f invalide';
                    return;
                }
                const account = {
                    access_token: account_connect.access_token,
                    client_token: account_connect.uuid,
                    uuid: account_connect.uuid,
                    name: account_connect.name,
                    user_properties: account_connect.user_properties,
                    meta: {
                        type: account_connect.meta.type,
                        offline: true
                    },
                    user_info: {
                        role: account_connect.user_info.role,
                        monnaie: account_connect.user_info.money,
                    },
                };

                this.database.add(account, 'accounts');
                this.database.update({ uuid: "1234", selected: account.uuid }, 'accounts-selected');

                this.database.add(account, 'accounts')
                this.database.update({ uuid: "1234", selected: account.uuid }, 'accounts-selected');
                addAccount(account)
                changePanel("home");

                a2finput.value = "Code"
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                loginBtn.style.display = "block";
                infoLogin.innerHTML = "&nbsp;";
                mailInput.value = "Adresse email";
                passwordInput.value = "Mot de passe";
                passwordInput.type = "text";
                mailInput.style.color = "#909090";
                passwordInput.style.color = "#909090";
                a2finput.style.color = "#909090";
                document.querySelector(".login-card").style.display = "block";
                document.querySelector(".card-base").style.display = "block";
                document.querySelector('.a2f-card').style.display = "none";
            });
        });
        
        loginBtn.addEventListener("click", async () => {
            if (mailInput.value == "" | mailInput.value == "Adresse email") {
                infoLogin.innerHTML = "Entrez votre adresse email / Nom d'utilisateur"
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                return
            }
            if (passwordInput.value == "" | passwordInput.value == "Mot de passe") {
                infoLogin.innerHTML = "Entrez votre mot de passe"
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                return
            }
            await azuriom.login(mailInput.value, passwordInput.value).then(async account_connect => {
                console.log(account_connect);
                if (this.config.whitelist == true && !this.whitelisted.whitelisted.includes(account_connect.name)) {
                    loginBtn.disabled = false;
                    mailInput.disabled = false;
                    passwordInput.disabled = false;
                    infoLogin.innerHTML = 'Vous n êtes pas whitelisté'
                    return
                }
                if (account_connect.reason === 'user_banned') {
                    loginBtn.disabled = false;
                    mailInput.disabled = false;
                    passwordInput.disabled = false;
                    infoLogin.innerHTML = 'Votre compte est banni'
                    return
                }
                if (account_connect.A2F === true) {
                    document.querySelector('.a2f-card').style.display = "block";
                    document.querySelector(".card-base").style.display = "none";
                    cancelMojangBtn.disabled = false;
                    return;
                }
                let account = {
                    access_token: account_connect.access_token,
                    client_token: account_connect.uuid,
                    uuid: account_connect.uuid,
                    name: account_connect.name,
                    user_properties: account_connect.user_properties,
                    meta: {
                        type: account_connect.meta.type,
                        offline: true
                    },
                    user_info: {
                        role: account_connect.user_info.role,
                        monnaie: account_connect.user_info.money,
                    },
                }
                this.database.add(account, 'accounts')
                this.database.update({ uuid: "1234", selected: account.uuid }, 'accounts-selected');
                addAccount(account)
                changePanel("home");
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                loginBtn.style.display = "block";
                infoLogin.innerHTML = "&nbsp;";
                mailInput.value = "Adresse email";
                passwordInput.value = "Mot de passe";
                passwordInput.type = "text";
                mailInput.style.color = "#909090";
                passwordInput.style.color = "#909090";
              }).catch(err => {
                console.log(err);
                loginBtn.disabled = false;
                mailInput.disabled = false;
                passwordInput.disabled = false;
                infoLogin.innerHTML = 'Adresse E-mail ou mot de passe invalide'
               
            })

            
            
            
        })
    }

}



export default Login;