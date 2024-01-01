import {readdir} from "node:fs/promises";

const contentDir = 'content'

async function getProjects() {
    return readdir(contentDir)
}


getProjects()
    .then((files) => console.log('Files in the directory:', files))
    .catch((error) => console.error('Error reading directory:', error));
