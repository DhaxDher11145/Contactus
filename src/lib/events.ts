import { collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, setDoc, where } from 'firebase/firestore';
import { firebaseServices, IS_MOCK_MODE } from './firebase';
export type Participant = { id: string; nombre: string; email: string; telefono: string };
export type Course = { id: string; nombre: string; fecha: string; horas: number; asistenciaAbierta: boolean; categoria?: string };
export type Certificate = { id: string; folio: string; participanteId: string; email: string; nombre: string; cursoId: string; curso: string; fecha: string; horas: number };
export type Template = { x: number; y: number; fontSize: number; color: string; align: 'center' | 'left' };
export const defaultTemplate: Template = { x: 396, y: 300, fontSize: 27, color: '#183044', align: 'center' };
function templateFrom(value: Partial<Template> | undefined): Template {
  return {
    x: typeof value?.x === 'number' ? value.x : defaultTemplate.x,
    y: typeof value?.y === 'number' ? value.y : defaultTemplate.y,
    fontSize: typeof value?.fontSize === 'number' ? value.fontSize : defaultTemplate.fontSize,
    color: typeof value?.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : defaultTemplate.color,
    align: value?.align === 'left' ? 'left' : defaultTemplate.align,
  };
}
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const participantId = (email: string) => normalizeEmail(email);
export const validPin = (pin: string) => /^\d{4}$/.test(pin);
export function assertAttendance(participant: Participant | undefined, course: Course | undefined, pin: string, expectedPin: string, usedEmail?: string) {
  if (!participant) throw new Error('Este correo aún no está registrado. Completa tu registro único.');
  if (!course?.asistenciaAbierta) throw new Error('El pase de lista de este curso está cerrado.');
  if (!validPin(pin) || pin !== expectedPin) throw new Error('El PIN de asistencia no es correcto.');
  if (usedEmail && usedEmail !== participant.email) throw new Error('Este dispositivo ya registró la asistencia de otra persona para este curso.');
}
type Store = { participantes: Participant[]; cursos: Course[]; constancias: Certificate[]; pins: Record<string, string>; plantilla: Template };
function seed(): Store {
 return { participantes: [], constancias: [], plantilla: defaultTemplate, pins: { liderazgo: '4826', herramientas: '7351', comunicacion: '1924' }, cursos: [
 {id:'liderazgo',nombre:'Liderazgo y gestión de equipos',fecha:'2026-11-18',horas:4,asistenciaAbierta:true,categoria:'Desarrollo profesional'},
 {id:'herramientas',nombre:'Herramientas digitales para la productividad',fecha:'2026-11-20',horas:3,asistenciaAbierta:true,categoria:'Tecnología'},
 {id:'comunicacion',nombre:'Comunicación efectiva y trabajo colaborativo',fecha:'2026-11-25',horas:5,asistenciaAbierta:false,categoria:'Habilidades humanas'}] };
}
function read(): Store { const raw = localStorage.getItem('acredita-demo-v1'); if (raw) { try { return JSON.parse(raw); } catch { /* restore seed */ } } const data=seed(); write(data); return data; }
function write(data: Store) { localStorage.setItem('acredita-demo-v1', JSON.stringify(data)); window.dispatchEvent(new Event('acredita-data')); }
export async function listCourses(): Promise<Course[]> { if(IS_MOCK_MODE) return read().cursos; return (await getDocs(collection(firebaseServices().db,'cursos'))).docs.map(d=>({...d.data(),id:d.id}) as Course); }
export function watchCourses(cb: (courses:Course[])=>void) { if(IS_MOCK_MODE) { const update=()=>cb(read().cursos); update(); window.addEventListener('acredita-data',update); window.addEventListener('storage',update); return ()=>{window.removeEventListener('acredita-data',update);window.removeEventListener('storage',update);}; } return onSnapshot(collection(firebaseServices().db,'cursos'),snap=>cb(snap.docs.map(d=>({...d.data(),id:d.id}) as Course))); }
export async function registerParticipant(input: Omit<Participant,'id'>) { if(normalizeEmail(input.email).includes('/'))throw new Error('Usa un correo electrónico sin barras.'); const person={...input,nombre:input.nombre.trim(),email:normalizeEmail(input.email),id:participantId(input.email)}; if(IS_MOCK_MODE) {const data=read();if(data.participantes.some(p=>p.id===person.id)) throw new Error('Este correo ya está registrado. Puedes pasar lista o consultar tus constancias.');data.participantes.push(person);write(data);return person;} const ref=doc(firebaseServices().db,'participantes',person.id);await runTransaction(firebaseServices().db,async tx=>{if((await tx.get(ref)).exists())throw new Error('Este correo ya está registrado.');tx.set(ref,person);});return person; }
function makeCertificate(person:Participant,course:Course): Certificate { const folio=`CERT-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase()}`;return {id:folio,folio,participanteId:person.id,email:person.email,nombre:person.nombre,cursoId:course.id,curso:course.nombre,fecha:new Date().toISOString(),horas:course.horas}; }
export async function markAttendance(email:string,courseId:string,pin:string) {
 const normalized=normalizeEmail(email);const deviceKey=`acredita-attendance-${courseId}`;const used=localStorage.getItem(deviceKey);
 if(used&&used!==normalized)throw new Error('Este dispositivo ya registró la asistencia de otra persona para este curso.');
 let cert:Certificate;
 if(IS_MOCK_MODE){const data=read();const person=data.participantes.find(p=>p.email===normalized);const course=data.cursos.find(c=>c.id===courseId);assertAttendance(person,course,pin,data.pins[courseId]??'',used??undefined);if(!person||!course)throw new Error('Datos incompletos.');if(data.constancias.some(c=>c.email===normalized&&c.cursoId===courseId))throw new Error('Tu asistencia ya está registrada para este curso.');cert=makeCertificate(person,course);data.constancias.push(cert);write(data);}
 else {const db=firebaseServices().db;cert=await runTransaction(db,async tx=>{const p=await tx.get(doc(db,'participantes',participantId(email)));const c=await tx.get(doc(db,'cursos',courseId));const attendanceRef=doc(db,'asistencias',`${courseId}_${participantId(email)}`);const previous=await tx.get(attendanceRef);if(!p.exists())throw new Error('Este correo aún no está registrado.');if(!c.exists()||!c.data()['asistenciaAbierta'])throw new Error('El pase de lista está cerrado.');if(previous.exists())throw new Error('Tu asistencia ya está registrada.');if(!validPin(pin))throw new Error('El PIN debe tener 4 dígitos.');const result=makeCertificate(p.data() as Participant,{...c.data(),id:c.id} as Course);tx.set(attendanceRef,{email:normalized,cursoId:courseId,pin,folio:result.folio});tx.set(doc(db,'constancias',result.folio),result);return result;}).catch(()=>{throw new Error('No se pudo registrar. Verifica el PIN y que tu asistencia no esté registrada.');});}
 localStorage.setItem(deviceKey,normalized);return cert;
}
export async function findCertificates(email:string):Promise<Certificate[]> {if(IS_MOCK_MODE)return read().constancias.filter(c=>c.email===normalizeEmail(email));return(await getDocs(query(collection(firebaseServices().db,'constancias'),where('email','==',normalizeEmail(email))))).docs.map(d=>d.data() as Certificate);}
export async function findCertificate(folio:string):Promise<Certificate|undefined>{if(IS_MOCK_MODE)return read().constancias.find(c=>c.folio===folio);const snap=await getDoc(doc(firebaseServices().db,'constancias',folio));return snap.exists()?snap.data() as Certificate:undefined;}
export async function adminParticipants():Promise<Participant[]>{if(IS_MOCK_MODE)return read().participantes;return(await getDocs(collection(firebaseServices().db,'participantes'))).docs.map(d=>d.data() as Participant);}
export async function adminCertificates():Promise<Certificate[]>{if(IS_MOCK_MODE)return read().constancias;return(await getDocs(collection(firebaseServices().db,'constancias'))).docs.map(d=>d.data() as Certificate);}
export async function saveCourse(course:Course,pin?:string){if(pin!==undefined&&!validPin(pin))throw new Error('El PIN debe tener exactamente 4 dígitos.');if(IS_MOCK_MODE){const data=read();data.cursos=[...data.cursos.filter(c=>c.id!==course.id),course];if(pin)data.pins[course.id]=pin;write(data);return;}const db=firebaseServices().db;await setDoc(doc(db,'cursos',course.id),course);if(pin)await setDoc(doc(db,'pines',course.id),{pin});}
export async function assignCertificate(person:Participant,course:Course){const existing=await findCertificates(person.email);if(existing.some(c=>c.cursoId===course.id))throw new Error('Esta persona ya tiene una constancia para este curso.');const cert=makeCertificate(person,course);if(IS_MOCK_MODE){const data=read();data.constancias.push(cert);write(data);}else await setDoc(doc(firebaseServices().db,'constancias',cert.folio),cert);return cert;}
export async function loadTemplate():Promise<Template>{if(IS_MOCK_MODE)return templateFrom(read().plantilla);const snap=await getDoc(doc(firebaseServices().db,'configuracion','plantilla'));return snap.exists()?templateFrom(snap.data() as Partial<Template>):defaultTemplate;}
export async function saveTemplate(template:Template){if(IS_MOCK_MODE){const data=read();data.plantilla=template;write(data);}else await setDoc(doc(firebaseServices().db,'configuracion','plantilla'),template);}
export const formatDate=(value:string)=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value.length===10?`${value}T12:00:00Z`:value));
