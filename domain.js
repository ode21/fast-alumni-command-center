export const statuses=['Belum dihubungi','Follow up','Fix voter','Sudah memilih'];
export function phoneKey(value){let v=String(value).replace(/[^0-9]/g,'');if(v.startsWith('0'))v='62'+v.slice(1);if(v.startsWith('8'))v='62'+v;return v;}
export function validateVoter(v,data){
 if(!v.name?.trim()||!v.alumniId?.trim()||!v.phone?.trim()||!v.pic)throw Error('Nama, ID alumni/NIM, WhatsApp dan PIC wajib diisi.');
 if(!/^62\d{8,13}$/.test(phoneKey(v.phone)))throw Error('Nomor WhatsApp tidak valid. Gunakan 08… atau +62…');
 if(!statuses.includes(v.status))throw Error('Status tidak valid.');
 if(!data.pics.some(p=>p.id===v.pic))throw Error('PIC tidak ditemukan.');
 if(data.voters.some(x=>x.id!==v.id&&(phoneKey(x.phone)===phoneKey(v.phone)||x.alumniId.trim().toLowerCase()===v.alumniId.trim().toLowerCase())))throw Error('Data ganda: WhatsApp atau ID alumni sudah terdaftar. Periksa pemilik data sebelumnya.');
 if(data.voters.filter(x=>x.pic===v.pic&&x.id!==v.id).length>=20)throw Error('PIC sudah menangani 20 alumni. Pilih PIC lain.');
 if(['Fix voter','Sudah memilih'].includes(v.status)&&(!v.consent||!v.verifiedAt))throw Error('Fix voter harus memiliki persetujuan dan tanggal konfirmasi langsung.');
 return {...v,phone:phoneKey(v.phone),name:v.name.trim(),alumniId:v.alumniId.trim()};
}
export function metrics(data){return {total:data.voters.length,fix:data.voters.filter(v=>['Fix voter','Sudah memilih'].includes(v.status)).length,voted:data.voters.filter(v=>v.status==='Sudah memilih').length,follow:data.voters.filter(v=>v.status==='Follow up').length};}
export function csvCell(v){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function validateBackup(d){if(d?.version!==1||!Array.isArray(d.voters)||!Array.isArray(d.pics)||!Array.isArray(d.orgs)||!Array.isArray(d.logs)||d.logs.some(x=>typeof x.text!=='string'||typeof x.at!=='string')||!Number.isInteger(d.target)||d.target<1)throw Error('Format cadangan tidak sesuai.');const ids=new Set();for(const p of d.pics){if(typeof p.id!=='string'||!p.id||typeof p.name!=='string'||ids.has(p.id))throw Error('Data PIC tidak valid.');ids.add(p.id);}const check={...d,voters:[]};for(const v of d.voters){if(typeof v.id!=='string'||check.voters.some(x=>x.id===v.id))throw Error('ID data tidak valid.');for(const k of ['name','alumniId','phone','city','company','community','notes','verifiedAt'])if(typeof v[k]!=='string')throw Error('Data alumni tidak valid.');check.voters.push(validateVoter(v,check));}for(const o of d.orgs)if(!['Perusahaan','Komunitas'].includes(o.type)||typeof o.name!=='string'||typeof o.city!=='string'||typeof o.contact!=='string')throw Error('Data organisasi tidak valid.');return {...d,voters:check.voters};}
