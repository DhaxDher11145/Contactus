import { beforeEach, describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { assertAttendance, validPin, registerParticipant, markAttendance, findCertificates, findCertificate, saveCourse, loadTemplate, saveTemplate, defaultTemplate, type Participant, type Course } from '@/lib/events';
const person:Participant={id:'ana@example.com',nombre:'Ana Hernández',email:'ana@example.com',telefono:'1234567890'};
const course:Course={id:'liderazgo',nombre:'Liderazgo',fecha:'2026-11-18',horas:4,asistenciaAbierta:true};
beforeEach(()=>{localStorage.clear();Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});});
describe('Attendance security rules',()=>{
 it('accepts exactly four numeric digits, preserving leading zeros',()=>{expect(validPin('0123')).toBe(true);expect(validPin('123')).toBe(false);expect(validPin('12345')).toBe(false);expect(validPin('12ab')).toBe(false);});
 it('requires a registered participant',()=>{expect(()=>assertAttendance(undefined,course,'4826','4826')).toThrow('registrado');});
 it('requires asistenciaAbierta true',()=>{expect(()=>assertAttendance(person,{...course,asistenciaAbierta:false},'4826','4826')).toThrow('cerrado');});
 it('matches the exact PIN, not a numerical equivalent',()=>{expect(()=>assertAttendance(person,course,'1234','0123')).toThrow('PIN');expect(()=>assertAttendance(person,course,'0123','0123')).not.toThrow();});
 it('blocks another identity on the same device/course',()=>{expect(()=>assertAttendance(person,course,'4826','4826','other@example.com')).toThrow('dispositivo');expect(()=>assertAttendance(person,course,'4826','4826',person.email)).not.toThrow();});
 it('rejects duplicate emails regardless of casing or surrounding spaces',async()=>{await registerParticipant(person);await expect(registerParticipant({...person,email:' ANA@example.com '})).rejects.toThrow('ya está registrado');});
 it('issues a unique folio and reads it back by email and folio',async()=>{await registerParticipant(person);const cert=await markAttendance(person.email,'liderazgo','4826');expect(cert.folio).toMatch(/^CERT-\d{4}-[A-F0-9]{12}$/);expect((await findCertificates('ANA@EXAMPLE.COM'))[0]?.nombre).toBe('Ana Hernández');expect((await findCertificate(cert.folio))?.cursoId).toBe('liderazgo');});
 it('does not issue a second certificate for the same attendance',async()=>{await registerParticipant(person);await markAttendance(person.email,'liderazgo','4826');await expect(markAttendance(person.email,'liderazgo','4826')).rejects.toThrow('ya está registrada');expect(await findCertificates(person.email)).toHaveLength(1);});
 it('persists the device/course block across separate operations',async()=>{await registerParticipant(person);await registerParticipant({...person,email:'other@example.com'});await markAttendance(person.email,'liderazgo','4826');await expect(markAttendance('other@example.com','liderazgo','4826')).rejects.toThrow('dispositivo');});
 it('rejects invalid course PINs on creation',async()=>{await expect(saveCourse(course,'123')).rejects.toThrow('4 dígitos');});
 it('persists the exact calibration coordinates and sizes',async()=>{await saveTemplate({...defaultTemplate,x:381,y:245,fontSize:24,color:'#102030'});expect(await loadTemplate()).toMatchObject({x:381,y:245,fontSize:24,color:'#102030'});});
});
