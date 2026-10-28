export const statuses=['Belum dihubungi','Follow up','Fix voter','Sudah memilih'];
export function phoneKey(value){let v=String(value).replace(/[^0-9]/g,'');if(v.startsWith('0'))v='62'+v.slice(1);if(v.startsWith('8'))v='62'+v;return v;}
export function validateVoter(v,data){
 if(!v.name?.trim()||!v.alumniId?.trim()||!v.phone?.trim()||!v.team)throw Error('Nama, ID alumni/NIM, WhatsApp dan timses wajib diisi.');
 if(!/^62\d{8,13}$/.test(phoneKey(v.phone)))throw Error('Nomor WhatsApp tidak valid. Gunakan 08… atau +62…');
 if(!statuses.includes(v.status))throw Error('Status tidak valid.');
 if(!data.teams.some(p=>p.id===v.team))throw Error('Timses tidak ditemukan.');
 if(data.voters.some(x=>x.id!==v.id&&(phoneKey(x.phone)===phoneKey(v.phone)||x.alumniId.trim().toLowerCase()===v.alumniId.trim().toLowerCase())))throw Error('Data ganda: WhatsApp atau ID alumni sudah terdaftar. Periksa pemilik data sebelumnya.');
 if(data.voters.filter(x=>x.team===v.team&&x.id!==v.id).length>=10)throw Error('Timses sudah menangani 10 alumni. Pilih timses lain.');
 if(['Fix voter','Sudah memilih'].includes(v.status)&&(!v.consent||!v.verifiedAt))throw Error('Fix voter harus memiliki persetujuan dan tanggal konfirmasi langsung.');
 const pic=data.pics.find(p=>p.id===data.teams.find(t=>t.id===v.team).pic);
 const year=data.chairs.find(c=>c.id===pic?.chair)?.year||'';
 return {...v,year,phone:phoneKey(v.phone),name:v.name.trim(),alumniId:v.alumniId.trim()};
}
export function metrics(data){return {total:data.voters.length,fix:data.voters.filter(v=>['Fix voter','Sudah memilih'].includes(v.status)).length,voted:data.voters.filter(v=>v.status==='Sudah memilih').length,follow:data.voters.filter(v=>v.status==='Follow up').length};}
export function csvCell(v){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function validateTeam(t,data){if(!t.name?.trim()||!data.pics.some(p=>p.id===t.pic))throw Error('Nama timses dan PIC wajib valid.');if(data.teams.some(x=>x.id!==t.id&&x.name.trim().toLowerCase()===t.name.trim().toLowerCase()))throw Error('Nama timses sudah terdaftar.');if(data.teams.filter(x=>x.pic===t.pic&&x.id!==t.id).length>=50)throw Error('PIC sudah membawahi 50 timses. Pilih PIC lain.');return {...t,name:t.name.trim()};}
export function picVoters(data,pic){const ids=new Set(data.teams.filter(t=>t.pic===pic).map(t=>t.id));return data.voters.filter(v=>ids.has(v.team));}
export function validatePic(p,data){
 if(!p.name?.trim()||!p.department?.trim()||!data.chairs.some(c=>c.id===p.chair))throw Error('Nama PIC, jurusan dan Ketua PIC Angkatan wajib diisi.');
 if(data.pics.some(x=>x.id!==p.id&&x.chair===p.chair&&x.department.trim().toLowerCase()===p.department.trim().toLowerCase()))throw Error('Angkatan dan jurusan ini sudah memiliki PIC. Edit PIC yang sudah ada.');
 return {...p,name:p.name.trim(),department:p.department.trim()};
}
export function validateChair(c,data){
 if(!c.name?.trim()||!/^\d{4}$/.test(c.year)||Number(c.year)<1950||Number(c.year)>2100)throw Error('Nama ketua dan angkatan (1950–2100) wajib valid.');
 if(data.chairs.some(x=>x.id!==c.id&&x.year===c.year))throw Error('Angkatan ini sudah memiliki Ketua PIC Angkatan.');
 return {...c,name:c.name.trim()};
}
export function chairVoters(data,chair){return data.pics.filter(p=>p.chair===chair).flatMap(p=>picVoters(data,p.id));}
export function validateBackup(d){
 if(d?.version!==3||typeof d.chief!=='string'||!Array.isArray(d.chairs)||!Array.isArray(d.teams)||!Array.isArray(d.voters)||!Array.isArray(d.pics)||!Array.isArray(d.orgs)||!Array.isArray(d.logs)||d.logs.some(x=>typeof x.text!=='string'||typeof x.at!=='string')||!Number.isInteger(d.target)||d.target<1)throw Error('Format cadangan tidak sesuai (gunakan versi hierarki 3).');
 const chairCheck={...d,chairs:[]};for(const c of d.chairs){if(typeof c.id!=='string'||chairCheck.chairs.some(x=>x.id===c.id))throw Error('ID Ketua PIC Angkatan tidak valid.');chairCheck.chairs.push(validateChair(c,chairCheck));}
 const ids=new Set(),picCheck={...d,pics:[]};for(const p of d.pics){if(typeof p.id!=='string'||!p.id||typeof p.name!=='string'||typeof p.city!=='string'||ids.has(p.id))throw Error('Data PIC tidak valid.');ids.add(p.id);picCheck.pics.push(validatePic(p,picCheck));}
 const check={...d,voters:[],teams:[]};for(const t of d.teams){if(typeof t.id!=='string'||typeof t.city!=='string'||check.teams.some(x=>x.id===t.id))throw Error('Data timses tidak valid.');check.teams.push(validateTeam(t,check));}
 for(const v of d.voters){if(typeof v.id!=='string'||check.voters.some(x=>x.id===v.id))throw Error('ID data tidak valid.');for(const k of ['name','alumniId','phone','city','company','community','notes','verifiedAt'])if(typeof v[k]!=='string')throw Error('Data alumni tidak valid.');check.voters.push(validateVoter(v,check));}
 for(const o of d.orgs)if(!['Perusahaan','Komunitas'].includes(o.type)||typeof o.name!=='string'||typeof o.city!=='string'||typeof o.contact!=='string')throw Error('Data organisasi tidak valid.');return {...d,voters:check.voters,teams:check.teams};
}
