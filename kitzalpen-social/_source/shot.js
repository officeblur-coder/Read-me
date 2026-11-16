const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
(async()=>{const [out,...files]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1350}});
for(const f of files){await pg.goto('file://'+f);await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(150);
const n=path.join(out,path.basename(f).replace('.html','.png'));await pg.screenshot({path:n});console.log(n)}
await b.close()})();
