export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 py-12">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-[var(--foreground)]">
          Política de Privacidad
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-slate max-w-none space-y-6 text-[var(--foreground)]">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introducción</h2>
            <p>
              Luz Parroquial (&quot;nosotros&quot;, &quot;nuestro&quot; o &quot;nos&quot;) está comprometido con la
              protección de su privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y
              protegemos su información cuando utiliza la <strong>aplicación móvil Luz Parroquial</strong> (oración y
              contenido espiritual), la <strong>plataforma web de gestión parroquial</strong> y los servicios asociados
              en conjunto (el &quot;Servicio&quot;).
            </p>
            <p>
              Al usar nuestro Servicio, usted acepta la recopilación y el uso de información de acuerdo con esta 
              política. Esta política cumple con el Reglamento General de Protección de Datos (GDPR), la Ley Federal 
              de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México, y otras 
              leyes de protección de datos aplicables.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Información que Recopilamos</h2>
            <h3 className="text-xl font-semibold mb-3">2.1 Información Personal</h3>
            <p>Recopilamos información que usted nos proporciona directamente, incluyendo:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Nombre e información de contacto (correo electrónico, número de teléfono)</li>
              <li>Afiliación parroquial y rol</li>
              <li>Solicitudes de sacramentos y documentos relacionados</li>
              <li>Intenciones de oración y donaciones</li>
              <li>Registros de eventos y participación en ministerios</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Información Recopilada Automáticamente</h3>
            <p>Recopilamos automáticamente cierta información cuando usa nuestro Servicio:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Información del dispositivo y dirección IP</li>
              <li>Datos de uso y registros de acceso</li>
              <li>Tokens de autenticación y datos de sesión</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cómo Usamos Su Información</h2>
            <p>Usamos la información que recopilamos para:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Proporcionar, mantener y mejorar nuestro Servicio</li>
              <li>Procesar solicitudes de sacramentos y gestionar registros parroquiales</li>
              <li>Enviar notificaciones sobre eventos y anuncios parroquiales</li>
              <li>Facilitar donaciones y gestionar ofrendas</li>
              <li>Cumplir con obligaciones legales y proteger nuestros derechos</li>
              <li>Responder a sus solicitudes y proporcionar soporte al cliente</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Compartir y Divulgar Datos</h2>
            <p>No vendemos, intercambiamos ni alquilamos su información personal. Podemos compartir su información solo:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Con los administradores de su parroquia (solo dentro de su parroquia)</li>
              <li>Con proveedores de servicios que ayudan a operar nuestro Servicio (bajo estrictos acuerdos de confidencialidad)</li>
              <li>Cuando lo requiera la ley o para proteger nuestros derechos legales</li>
              <li>Con su consentimiento explícito</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Seguridad de los Datos</h2>
            <p>
              Implementamos medidas técnicas y organizativas apropiadas para proteger su información personal, 
              incluyendo encriptación, controles de acceso y evaluaciones de seguridad regulares. Sin embargo, 
              ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Sus Derechos</h2>
            <p>Usted tiene derecho a:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Acceso:</strong> Solicitar una copia de sus datos personales</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
              <li><strong>Supresión:</strong> Solicitar la eliminación de sus datos personales</li>
              <li><strong>Portabilidad:</strong> Recibir sus datos en un formato estructurado y legible por máquina</li>
              <li><strong>Oposición:</strong> Oponerse al procesamiento de sus datos personales</li>
              <li><strong>Restricción:</strong> Solicitar la restricción del procesamiento</li>
              <li><strong>Retirar Consentimiento:</strong> Retirar el consentimiento en cualquier momento</li>
            </ul>
            <p className="mt-4">
              Para ejercer estos derechos, por favor contáctenos en{' '}
              <a href="/data-request" className="text-blue-600 hover:underline">
                nuestro formulario de solicitud de datos
              </a>
              {' '}o envíenos un correo electrónico a la información de contacto proporcionada a continuación.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Retención de Datos</h2>
            <p>
              Retenemos su información personal solo durante el tiempo necesario para cumplir con los propósitos 
              descritos en esta Política de Privacidad, a menos que la ley requiera un período de retención más largo. 
              Cuando solicite la eliminación de su cuenta, eliminaremos suavemente su cuenta y la eliminaremos 
              permanentemente después de 90 días, a menos que estemos obligados a retenerla por motivos legales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Privacidad de los menores</h2>
            <p>
              El Servicio puede ser utilizado por personas de distintas edades, incluidas familias. Si usted es menor
              de edad en su país de residencia, debe usar el Servicio con la supervisión y, cuando la ley lo exija, el
              consentimiento de su padre, madre o tutor legal.
            </p>
            <p className="mt-3">
              No recopilamos a sabiendas información personal de menores de 13 años sin el consentimiento verificable de
              los padres o tutores cuando así lo exijan leyes aplicables (por ejemplo, COPPA en Estados Unidos). Si cree
              que un menor nos ha proporcionado datos sin el consentimiento adecuado, contáctenos de inmediato mediante
              el{' '}
              <a href="/data-request" className="text-blue-600 hover:underline">
                formulario de solicitud de datos
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Transferencias Internacionales de Datos</h2>
            <p>
              Su información puede ser transferida y mantenida en computadoras ubicadas fuera de su estado, 
              provincia, país u otra jurisdicción gubernamental. Nos aseguramos de que existan salvaguardas 
              apropiadas para proteger su información de acuerdo con esta Política de Privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Cambios a Esta Política de Privacidad</h2>
            <p>
              Podemos actualizar esta Política de Privacidad de vez en cuando. Le notificaremos de cualquier cambio 
              publicando la nueva Política de Privacidad en esta página y actualizando la fecha de "Última actualización". 
              Se le recomienda revisar esta Política de Privacidad periódicamente para cualquier cambio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contáctenos</h2>
            <p>
              Si tiene alguna pregunta sobre esta Política de Privacidad o desea ejercer sus derechos, por favor 
              contáctenos:
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
