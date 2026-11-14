import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { loadTemplate, type Certificate, type Template } from './events';
export async function createCertificatePdf(cert:Certificate,settings?:Template,source?:ArrayBuffer):Promise<Uint8Array>{
 const config=settings??await loadTemplate();
 const bytes=source??await (async()=>{const response=await fetch('/plantilla.pdf');if(!response.ok)throw new Error('No se encontró /plantilla.pdf.');return response.arrayBuffer();})();
 const pdf=await PDFDocument.load(bytes);
 const page=pdf.getPages()[0];if(!page)throw new Error('El PDF no contiene páginas.');
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const width=page.getWidth();
 const hex=config.color.replace('#','');const color=/^[0-9a-f]{6}$/i.test(hex)?rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255):rgb(.09,.18,.23);
 const available=config.align==='center'?Math.min(config.x,width-config.x)*2-40:width-config.x-25;const size=Math.min(config.fontSize,Math.max(6,available/font.widthOfTextAtSize(cert.nombre,1)));const nameX=config.align==='center'?config.x-font.widthOfTextAtSize(cert.nombre,size)/2:config.x;
 page.drawText(cert.nombre,{x:Math.max(10,nameX),y:config.y,size,font,color});
 return pdf.save();
}
export function downloadFile(bytes:Uint8Array|string,name:string,type:string){const blob=new Blob([typeof bytes==='string'?bytes:new Uint8Array(bytes)],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export async function downloadCertificate(cert:Certificate){downloadFile(await createCertificatePdf(cert),`${cert.folio}.pdf`,'application/pdf');}
