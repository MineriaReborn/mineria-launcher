

import crypto from 'crypto';
import fs from 'fs';
import admZip from 'adm-zip';

function getPathLibraries(main: any, nativeString?: any, forceExt?: any) {
    let libSplit = main.split(':')
    let fileName = libSplit[3] ? `${libSplit[2]}-${libSplit[3]}` : libSplit[2];
    let finalFileName = fileName.includes('@') ? fileName.replace('@', '.') : `${fileName}${nativeString || ''}${forceExt || '.jar'}`;
    let pathLib = `${libSplit[0].replace(/\./g, '/')}/${libSplit[1]}/${libSplit[2].split('@')[0]}`
    return {
        path: pathLib,
        name: `${libSplit[1]}-${finalFileName}`
    };
}

async function getFileHash(filePath: string, algorithm: string = 'sha1') {
    let shasum = crypto.createHash(algorithm);

    let file = fs.createReadStream(filePath);
    file.on('data', data => {
        shasum.update(data);
    });

    let hash = await new Promise(resolve => {
        file.on('end', () => {
            resolve(shasum.digest('hex'));
        });
    });
    return hash;
}

function isold(json: any) {
    return json.assets === 'legacy' || json.assets === 'pre-1.6'
}



let mirrors = [
    "https://maven.creeperhost.net",
    "https://libraries.minecraft.net",
    "https://repo1.maven.org/maven2"
]

async function getFileFromArchive(jar: string, file: string = null, path: string = null) {
    let fileReturn: any = []
    let zip = new admZip(jar);
    let entries = zip.getEntries();

    return await new Promise(resolve => {
        for (let entry of entries) {
            if (!entry.isDirectory && !path) {
                if (entry.entryName == file) fileReturn = entry.getData();
                if (!file) fileReturn.push({ name: entry.entryName, data: entry.getData() });
            }

            if (!entry.isDirectory && entry.entryName.includes(path) && path) {
                fileReturn.push(entry.entryName);
            }
        }
        resolve(fileReturn);
    });
}

async function createZIP(files: any, ignored: any = null) {
    let zip = new admZip();

    return await new Promise(resolve => {
        for (let entry of files) {
            if (ignored && entry.name.includes(ignored)) continue;
            zip.addFile(entry.name, entry.data);
        }
        resolve(zip.toBuffer());
    });
}

function skipLibrary(lib) {
    let Lib = { win32: "windows", darwin: "osx", linux: "linux" };

    let skip = false;
    if (lib.rules) {
        skip = true;
        lib.rules.forEach(({ action, os, features }) => {
            if (features) return true;
            if (action === 'allow' && ((os && os.name === Lib[process.platform]) || !os)) {
                skip = false;
            }

            if (action === 'disallow' && ((os && os.name === Lib[process.platform]) || !os)) {
                skip = true;
            }
        });
    }
    return skip;
}

export {
    getPathLibraries,
    isold,
    getFileHash,
    mirrors,
    getFileFromArchive,
    createZIP,
    skipLibrary
};