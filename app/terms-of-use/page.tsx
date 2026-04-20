export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 py-12">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-[var(--foreground)]">
          Términos de Uso
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-slate max-w-none space-y-6 text-[var(--foreground)]">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Aceptación de los Términos</h2>
            <p>
              Al acceder o utilizar Luz Parroquial ("el Servicio"), usted acepta estar sujeto a estos Términos de Uso 
              y a todas las leyes y regulaciones aplicables. Si no está de acuerdo con alguno de estos términos, 
              tiene prohibido usar o acceder al Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Licencia de Uso</h2>
            <p>
              Se otorga permiso para acceder y utilizar temporalmente el Servicio para sus necesidades de gestión parroquial. 
              Esta licencia es personal, intransferible y no exclusiva. Bajo esta licencia, usted puede:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Acceder y usar el Servicio para propósitos legítimos de gestión parroquial</li>
              <li>Crear y gestionar registros parroquiales, eventos y comunicaciones</li>
              <li>Procesar solicitudes de sacramentos y donaciones de acuerdo con las leyes aplicables</li>
            </ul>
            <p className="mt-4">Esta licencia <strong>no</strong> le permite:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Modificar o copiar el Servicio o su contenido</li>
              <li>Usar el Servicio para cualquier propósito comercial sin autorización</li>
              <li>Intentar realizar ingeniería inversa o descompilar el Servicio</li>
              <li>Eliminar cualquier notación de derechos de autor o propiedad</li>
              <li>Transferir el Servicio o su contenido a otra persona</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Registro de Cuenta</h2>
            <p>
              Para acceder a ciertas funciones del Servicio, debe registrar una cuenta. Usted acepta:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Proporcionar información precisa, actual y completa</li>
              <li>Mantener y actualizar su información para mantenerla precisa</li>
              <li>Mantener la seguridad de las credenciales de su cuenta</li>
              <li>Aceptar la responsabilidad de todas las actividades bajo su cuenta</li>
              <li>Notificarnos inmediatamente de cualquier uso no autorizado de su cuenta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Uso Aceptable</h2>
            <p>Usted acepta no usar el Servicio para:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Violar cualquier ley o regulación aplicable</li>
              <li>Infringir los derechos de otros</li>
              <li>Transmitir código dañino, virus o software malicioso</li>
              <li>Acosar, abusar o dañar a otros usuarios</li>
              <li>Recopilar o almacenar datos personales de otros usuarios sin consentimiento</li>
              <li>Suplantar a cualquier persona o entidad</li>
              <li>Interferir con o interrumpir el Servicio o los servidores</li>
              <li>Usar sistemas automatizados para acceder al Servicio sin autorización</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Datos Parroquiales y Responsabilidades</h2>
            <p>
              Usted es responsable de todos los datos que ingrese en el Servicio. Usted acepta:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Cumplir con todas las leyes de protección de datos aplicables (GDPR, LFPDPPP, etc.)</li>
              <li>Obtener el consentimiento necesario antes de recopilar o procesar datos personales</li>
              <li>Mantener la confidencialidad y seguridad de la información de los feligreses</li>
              <li>Usar el Servicio solo para propósitos legítimos de gestión parroquial</li>
              <li>Asegurar que todo el personal parroquial con acceso a la cuenta entienda y cumpla con estos términos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Propiedad Intelectual</h2>
            <p>
              El Servicio y su contenido original, características y funcionalidad son propiedad de Luz Parroquial y 
              están protegidos por leyes internacionales de derechos de autor, marcas registradas, patentes, secretos 
              comerciales y otras leyes de propiedad intelectual. No puede reproducir, distribuir, modificar, crear 
              obras derivadas, exhibir públicamente o explotar cualquier parte del Servicio sin nuestro permiso 
              previo por escrito.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Terminación</h2>
            <p>
              Nos reservamos el derecho de terminar o suspender su cuenta y acceso al Servicio inmediatamente, 
              sin previo aviso, por cualquier incumplimiento de estos Términos de Uso. Al terminar, su derecho a usar 
              el Servicio cesará inmediatamente. También puede terminar su cuenta en cualquier momento contactándonos 
              a través de nuestro formulario de solicitud de datos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Descargo de Responsabilidad</h2>
            <p>
              El Servicio se proporciona "tal cual" y "según disponibilidad" sin ninguna garantía, expresa o implícita. 
              No garantizamos que:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>El Servicio será ininterrumpido, seguro o libre de errores</li>
              <li>Cualquier error o defecto será corregido</li>
              <li>El Servicio esté libre de virus u otros componentes dañinos</li>
              <li>Los resultados obtenidos del uso del Servicio serán precisos o confiables</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitación de Responsabilidad</h2>
            <p>
              En ningún caso Luz Parroquial, sus directores, empleados o afiliados serán responsables de ningún 
              daño indirecto, incidental, especial, consecuente o punitivo, incluyendo pérdida de ganancias, datos 
              o uso, incurrido por usted o cualquier tercero, ya sea en una acción de contrato o agravio, que surja 
              de su acceso o uso del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Indemnización</h2>
            <p>
              Usted acepta indemnizar, defender y mantener indemne a Luz Parroquial y sus funcionarios, directores, 
              empleados y agentes de y contra cualquier reclamo, responsabilidad, daño, pérdida y gasto, 
              incluyendo honorarios razonables de abogados, que surjan de o estén conectados de cualquier manera con 
              su acceso o uso del Servicio o su violación de estos Términos de Uso.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Ley Aplicable</h2>
            <p>
              Estos Términos de Uso se regirán e interpretarán de acuerdo con las leyes de México, 
              sin tener en cuenta sus disposiciones sobre conflictos de leyes. Cualquier disputa que surja bajo o 
              en relación con estos términos estará sujeta a la jurisdicción exclusiva de los tribunales de México.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Cambios a los Términos</h2>
            <p>
              Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos de Uso 
              en cualquier momento. Si una revisión es material, proporcionaremos al menos 30 días de aviso antes de 
              que los nuevos términos entren en vigor. Su uso continuado del Servicio después de la fecha de vigencia 
              de cualquier cambio constituye su aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Información de Contacto</h2>
            <p>
              Si tiene alguna pregunta sobre estos Términos de Uso, por favor contáctenos:
            </p>
            <ul className="list-none space-y-2 ml-4">
              <li>
                <strong>Correo:</strong>{' '}
                <a href="/data-request" className="text-blue-600 hover:underline">
                  Enviar una solicitud de datos
                </a>
              </li>
              <li>
                <strong>Formulario de Solicitud de Datos:</strong>{' '}
                <a href="/data-request" className="text-blue-600 hover:underline">
                  /data-request
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
