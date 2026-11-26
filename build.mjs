import {mkdir, copyFile, rm, cp} from 'node:fs/promises';
const files=['index.html','app.js','core.js','config.js','styles.css','favicon.svg','.nojekyll','mobile-design.js','mobile-design.css'];
await rm(new URL('./dist/',import.meta.url),{recursive:true,force:true});
await mkdir(new URL('./dist/',import.meta.url),{recursive:true});
for(const file of files)await copyFile(new URL('./'+file,import.meta.url),new URL('./dist/'+file,import.meta.url));
console.log('Static preview prepared: dist/');

await cp(new URL('./assets/',import.meta.url),new URL('./dist/assets/',import.meta.url),{recursive:true});

