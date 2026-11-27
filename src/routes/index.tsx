import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import {
  UserRound,
  Mail,
  Hash,
  ArrowRight,
  Info,
  CalendarDays,
  Clock3,
  Award,
  Check,
  LockKeyhole,
  ClipboardCheck,
  Download,
  Search,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortalShell, Feedback } from '@/components/portal';
import { pageHead } from '@/lib/head';
import {
  registerParticipant,
  watchCourses,
  markAttendance,
  findCertificates,
  formatDate,
  sanitizePersonName,
  type Course,
  type Certificate,
} from '@/lib/events';
import { downloadCertificate } from '@/lib/certificates';
import workshop from '@/assets/workshop.jpg';

const VENUES = [
  {
    date: '27 de noviembre',
    title: 'Centro de Convenciones COCO',
    address: 'Orizaba, Ver.',
    mapsUrl: 'https://maps.app.goo.gl/ZF1LjGDmFBbkaxcaA',
    embedUrl:
      'https://maps.google.com/maps?q=Centro%20de%20Convenciones%20COCO%2C%20Orizaba%2C%20Veracruz&t=&z=16&ie=UTF8&iwloc=&output=embed',
  },
  {
    date: '28 de noviembre',
    title: 'Talleres Salas Contactus',
    address: 'Calle 8 #252, Col. Rafael Alvarado, Orizaba, Ver.',
    mapsUrl: 'https://maps.app.goo.gl/RpNUq3TKA14L4KHPA?g_st=aw',
    embedUrl:
      'https://maps.google.com/maps?q=Calle%208%20252%2C%20Rafael%20Alvarado%2C%20Orizaba%2C%20Veracruz&t=&z=16&ie=UTF8&iwloc=&output=embed',
  },
];

export const Route = createFileRoute('/')({
  head: () =>
    pageHead(
      'Portal de participantes',
      'Regístrate una sola vez, confirma tu asistencia y descarga tus constancias.'
    ),
  component: Index,
});

function Index() {
  const [tab, setTab] = useState(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [searched, setSearched] = useState(false);

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');

  useEffect(() => watchCourses(setCourses), []);

  function changeTab(i: number) {
    setTab(i);
    setMessage('');
    setError(false);
    setSearched(false);
    setCerts([]);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMessage('');
    setError(false);

    try {
      if (tab === 0) {
        const cleanNombres = sanitizePersonName(nombres).trim();
        const cleanApellidos = sanitizePersonName(apellidos).trim();
        const nombreCompleto = `${cleanNombres} ${cleanApellidos}`.trim().toUpperCase();

        await registerParticipant({
          nombres: cleanNombres,
          apellidos: cleanApellidos,
          nombre: nombreCompleto,
          email: String(data.get('email') ?? ''),
          telefono: String(data.get('telefono') ?? ''),
        });

        setMessage(
          `¡Registro completado como ${nombreCompleto}! Ahora puedes confirmar tu asistencia en Pase de Lista.`
        );
        setNombres('');
        setApellidos('');
        form.reset();
      } else if (tab === 1) {
        const email = String(data.get('email') ?? '');
        const selectedCourseId = String(data.get('curso') ?? '');
        const pin = String(data.get('pin') ?? '');

        const cert = await markAttendance(email, selectedCourseId, pin);
        setMessage(
          `¡Asistencia confirmada! Tu constancia ${cert.folio} está disponible en Mis Constancias.`
        );
      } else {
        setSearched(false);
        setCerts([]);
        const email = String(data.get('email') ?? '');
        const results = await findCertificates(email);
        setCerts(results);
        setSearched(true);
      }
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : 'No fue posible completar la solicitud.');
    } finally {
      setBusy(false);
    }
  }

  async function download(cert: Certificate) {
    setBusy(true);
    setError(false);
    setMessage('');
    try {
      await downloadCertificate(cert);
    } catch (err) {
      setError(true);
      setMessage(
        err instanceof Error ? err.message : 'No se pudo generar el PDF. Intenta de nuevo.'
      );
    } finally {
      setBusy(false);
    }
  }

  const titles = [
    'Tu primer paso, tu registro',
    'Confirma tu asistencia',
    'Tus logros, en un solo lugar',
  ];
  const descriptions = [
    'Completa tus datos una sola vez para todos tus cursos.',
    'Registra tu presencia con el PIN que te compartió el instructor.',
    'Encuentra y descarga tus constancias acreditadas.',
  ];
  const Icon = [UserRound, ClipboardCheck, Award][tab] ?? UserRound;

  return (
    <PortalShell>
      <div className="page-intro">
        <div>
          <div className="eyebrow">APRENDE. PARTICIPA. CONTACTUS.</div>
          <h1 className="page-title">Portal de participantes</h1>
          <p className="subtitle">
            Tu formación merece ser reconocida. Gestiona aquí tu registro y tus constancias.
          </p>
        </div>
      </div>

      <div className="journey-tabs" role="tablist" aria-label="Portal de participantes">
        {['Registro Único', 'Pase de Lista', 'Mis Constancias'].map((label, i) => (
          <Button
            key={label}
            variant="ghost"
            role="tab"
            aria-selected={tab === i}
            className={`journey-tab ${tab === i ? 'selected' : ''}`}
            onClick={() => changeTab(i)}
          >
            <span className="step-number">{i + 1}</span>
            <span className="step-text">
              <strong>
                {i + 1}. {label}
              </strong>
              <small>
                {
                  [
                    'Crea tu perfil de participante',
                    'Confirma tu participación',
                    'Descarga tus acreditaciones',
                  ][i]
                }
              </small>
            </span>
          </Button>
        ))}
      </div>

      <div className="content-grid">
        <section className="form-panel">
          <div className="panel-heading">
            <div className="heading-icon">
              <Icon size={22} />
            </div>
            <div>
              <h2>{titles[tab]}</h2>
              <p>{descriptions[tab]}</p>
            </div>
          </div>

          <div className="form-body">
            <Feedback message={message} error={error} />

            <form onSubmit={submit} key={tab}>
              {tab === 0 && (
                <>
                  <label className="field">
                    <span className="field-label">
                      Nombre(s) <em>*</em>
                    </span>
                    <div className="input-wrap">
                      <UserRound />
                      <input
                        className="text-input uppercase"
                        name="nombres"
                        value={nombres}
                        onChange={(e) => setNombres(sanitizePersonName(e.target.value))}
                        placeholder="Ej. Juan Carlos"
                        required
                        minLength={2}
                        maxLength={60}
                        autoComplete="given-name"
                      />
                    </div>
                  </label>

                  <label className="field">
                    <span className="field-label">
                      Apellidos <em>*</em>
                    </span>
                    <div className="input-wrap">
                      <UserRound />
                      <input
                        className="text-input uppercase"
                        name="apellidos"
                        value={apellidos}
                        onChange={(e) => setApellidos(sanitizePersonName(e.target.value))}
                        placeholder="Ej. Pérez López"
                        required
                        minLength={2}
                        maxLength={60}
                        autoComplete="family-name"
                      />
                    </div>
                    <p className="field-hint">
                      Solo se permiten letras y tildes. Se imprimirá como NOMBRE(S) APELLIDOS en mayúsculas.
                    </p>
                  </label>
                </>
              )}

              <label className="field">
                <span className="field-label">
                  Correo electrónico <em>*</em>
                </span>
                <div className="input-wrap">
                  <Mail />
                  <input
                    type="email"
                    className="text-input"
                    name="email"
                    placeholder="nombre@ejemplo.com"
                    required
                    autoComplete="email"
                  />
                </div>
                {tab === 0 && (
                  <p className="field-hint">
                    Será tu identificador para el pase de lista y tus constancias.
                  </p>
                )}
              </label>

              {tab === 0 && (
                <>
                  <label className="field">
                    <span className="field-label">
                      Teléfono o matrícula <em>*</em>
                    </span>
                    <div className="input-wrap">
                      <Hash />
                      <input
                        className="text-input"
                        name="telefono"
                        placeholder="Tu número de teléfono o matrícula"
                        required
                        maxLength={40}
                      />
                    </div>
                  </label>

                  <div className="notice">
                    <Info />
                    <span>
                      <strong>Revisa tu ortografía y acentos antes de continuar.</strong>
                      <br />
                      Tu nombre se guardará en MAYÚSCULAS en el orden Nombre(s) + Apellidos para todas tus constancias.
                    </span>
                  </div>
                </>
              )}

              {tab === 1 && (
                <>
                  <label className="field">
                    <span className="field-label">
                      Curso <em>*</em>
                    </span>
                    <select className="text-input" name="curso" required defaultValue="">
                      <option value="" disabled>
                        Selecciona el curso al que asistes
                      </option>
                      {courses
                        .filter((c) => c.asistenciaAbierta)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="field">
                    <span className="field-label">
                      PIN de asistencia <em>*</em>
                    </span>
                    <div className="input-wrap">
                      <LockKeyhole />
                      <input
                        type="password"
                        className="text-input"
                        name="pin"
                        placeholder="Ingresa el PIN de 4 dígitos"
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        maxLength={4}
                        required
                      />
                    </div>
                    <p className="field-hint">Solicita el PIN al instructor de tu curso.</p>
                  </label>
                </>
              )}

              <Button className="submit-button" type="submit" disabled={busy}>
                {busy
                  ? 'Procesando…'
                  : ['Completar mi registro', 'Confirmar mi asistencia', 'Buscar mis constancias'][
                      tab
                    ]}
                {tab === 2 ? <Search size={17} /> : <ArrowRight size={17} />}
              </Button>

              {tab === 0 && (
                <p className="privacy-note">
                  <LockKeyhole size={11} />
                  Tus datos se usan únicamente para gestionar tu participación.
                </p>
              )}
            </form>

            {tab === 2 &&
              searched &&
              (certs.length ? (
                certs.map((c) => (
                  <article className="certificate-item" key={c.folio}>
                    <span className="status">
                      <Check size={12} />
                      Acreditado
                    </span>
                    <h3>{c.curso}</h3>
                    <p className="field-hint">
                      {c.nombre} · {formatDate(c.fecha)} · {c.horas} horas
                    </p>
                    <p className="field-hint">{c.folio}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      disabled={busy}
                      onClick={() => download(c)}
                    >
                      <Download />
                      Descargar PDF
                    </Button>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <Award size={32} />
                  <p>Aún no hay constancias asociadas a este correo.</p>
                </div>
              ))}
          </div>
        </section>

        <aside>
          <div className="side-heading">
            <h2>Próximos cursos</h2>
            <span className="count-label">{courses.length} cursos disponibles</span>
          </div>

          {courses.map((course, i) => (
            <article className="course-card" key={course.id}>
              {i === 0 && (
                <img
                  className="course-photo"
                  src={workshop}
                  width={1200}
                  height={608}
                  alt="Participantes colaborando en un taller de formación"
                />
              )}
              <div className="course-body">
                <div className="course-top">
                  <span className="course-category">
                    {course.categoria ?? 'Formación continua'}
                  </span>
                  <span className={`status ${course.asistenciaAbierta ? '' : 'closed'}`}>
                    <span className="status-dot" />
                    {course.asistenciaAbierta ? 'Asistencia abierta' : 'Próximamente'}
                  </span>
                </div>
                <h3 className="course-title">{course.nombre}</h3>
                <div className="course-meta">
                  <span>
                    <CalendarDays />
                    {formatDate(course.fecha)}
                    {course.horaInicio ? ` · ${course.horaInicio} hrs` : ''}
                  </span>
                  <span>
                    <Clock3 />
                    {course.horas} horas
                  </span>
                </div>
              </div>
            </article>
          ))}

          {VENUES.map((venue) => (
            <article className="course-card" key={venue.date}>
              <div className="course-body">
                <div className="course-top">
                  <span className="course-category">Sede · {venue.date}</span>
                </div>
                <h3 className="course-title flex items-center gap-2">
                  <MapPin size={18} className="shrink-0" />
                  <span>{venue.title}</span>
                </h3>
                <p className="field-hint mt-1 mb-3">{venue.address}</p>

                <div className="w-full overflow-hidden rounded-lg border mb-4">
                  <iframe
                    title={`Mapa de ${venue.title}`}
                    src={venue.embedUrl}
                    className="w-full h-48 border-0 block"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={venue.mapsUrl} target="_blank" rel="noopener noreferrer">
                    Abrir en Google Maps
                    <ExternalLink size={14} />
                  </a>
                </Button>
              </div>
            </article>
          ))}

          <div className="side-note">
            <Info />
            <span>
              ¿Ya te registraste? No necesitas hacerlo de nuevo.
              <br />
              Ve directamente al pase de lista de tu curso.
            </span>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}