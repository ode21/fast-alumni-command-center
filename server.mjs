import http from 'node:http';
import {readFile} from 'node:fs/promises';
const allowed=new Set(['index.html','style.css','app.js','domain.js']);
http.createServer(async(req,res)=>{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(!allowed.has(file)){res.writeHead(404).end();return;}try{const data=await readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(data);}catch{res.writeHead(404).end();}}).listen(3000,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:3000'));
