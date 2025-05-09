const pkg = require('../package.json');
const fetch = require("node-fetch")
let url = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url

let config = `${url}/launcher/config-launcher/config.json`;
let whitelist = `${url}/launcher/whitelist.json`;

class Config {
    
    GetConfig() {
        return new Promise((resolve, reject) => {
            fetch(config).then(config => {
                return resolve(config.json());
            }).catch(error => {
                return reject(error);
            })
        })
    }

    async GetNews() {
        try {
            const rss = await fetch("https://mineria.ovh/api/rss");
            const text = await rss.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "application/xml");
            const items = xml.querySelectorAll("item");
    
            const newsList = [];
    
            items.forEach((item, index) => {
                const title = item.querySelector("title")?.textContent || "Sans titre";
                const url = item.querySelector("link")?.textContent || "#";
                const image = item.querySelector("enclosure")?.getAttribute("url") || "https://mineria.ovh/files/img/default-news.jpg";
                const pubDate = item.querySelector("pubDate")?.textContent || "";
                const id = `${index + 1}`;
    
                newsList.push({
                    id,
                    title,
                    image,
                    publish_date: new Date(pubDate).toISOString().split("T").join(" ").split(".")[0],
                    url
                });
            });
    
            return newsList;
        } catch (e) {
            return false;
        }
    }

    async getWhiteListed() {
        try {
            let response = await fetch(whitelist);
            if (response.status === 200) {
                let data = await response.json();
                return data;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }
}

export default new Config;