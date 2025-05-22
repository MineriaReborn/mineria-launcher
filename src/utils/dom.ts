export function changePanel(id: string) {
    const panel = document.querySelector(`.${id}`) as HTMLElement;
    const active = document.querySelector(`.active`) as HTMLElement;
    if (active) active.classList.remove("active");
    panel?.classList.add("active");
}

export function addAccount(data: any) {
    const timestamp = Date.now();
    const head = document.querySelector(".player-head") as HTMLElement;
    const name = document.querySelector(".player-name") as HTMLElement;
    const role = document.querySelector(".player-role") as HTMLElement;

    if (head && name && role) {
        head.style.backgroundImage = `url(https://mineria.fr/api/skin-api/avatars/face/${data.name}/?t=${timestamp})`;
        name.textContent = data.name;
        role.textContent = data.user_info.role.name;
        role.style.color = data.user_info.role.color;
    }
}