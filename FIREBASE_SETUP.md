# Configuración de Firebase

La aplicación funciona inmediatamente en **modo demostración**, con datos locales. No representa un acceso real ni permite validar constancias desde otros dispositivos.

1. Crea una aplicación web en Firebase y completa las variables públicas de `.env.example` en la configuración del proyecto. No son credenciales administrativas.
2. Activa Firestore y Firebase Authentication → Correo electrónico/contraseña.
3. Crea el único administrador desde Firebase Console → Authentication → Users. No existe registro público en la aplicación.
4. Sustituye `REPLACE_WITH_ADMIN_UID` en `firestore.rules` por el UID del administrador y publica estas reglas desde la consola. **Nunca uses reglas abiertas en producción.**
5. Coloca tu PDF institucional en `public/plantilla.pdf`. Sin él se genera un respaldo horizontal. Cargar un PDF en el calibrador solo sirve para previsualizar y probar, no para reemplazar el archivo publicado.
6. Publica la aplicación y autoriza el dominio en Firebase Auth.

Las reglas mantienen el PIN en una colección privada; validan asistencia y emisión de constancias mediante una escritura atómica. El bloqueo por dispositivo es disuasorio: borrar localStorage o cambiar de navegador lo evade. No sustituye una verificación de identidad.

La búsqueda pública por correo y la validación de QR exponen nombre, curso, fecha y folio por requisito del producto. No almacenes datos confidenciales en constancias. Para evitar extracción masiva en producción se recomienda una función de búsqueda protegida por App Check y limitación de solicitudes; esta versión usa consultas directas a Firestore.

Las reglas aún deben desplegarse y probarse contra tu proyecto Firebase; sin configuración no se puede verificar el acceso real.
