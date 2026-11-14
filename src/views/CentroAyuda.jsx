import { useState } from "react";

const MANUALES = {
    usuario: {
        titulo: "Manual de usuario",
        descripcion: "Guía práctica para realizar las tareas diarias del hotel.",
        secciones: [
            {
                titulo: "Inicio, Dashboard e identificación",
                contenido: [
                    "Inicia sesión con el usuario y la contraseña que te asignó el administrador.",
                    "El Dashboard presenta el resumen operativo y accesos rápidos. El menú lateral muestra únicamente las áreas habilitadas para tu rol.",
                    "Pulsa tu usuario en la parte superior derecha para consultar tu identificación, rol y módulos habilitados. Usa Cerrar sesión al terminar."
                ]
            },
            {
                titulo: "Finanzas y caja",
                contenido: [
                    "Pagos y caja: consulta pagos y operaciones relacionadas con caja.",
                    "Aperturas de caja: registra o consulta la apertura de una caja según el procedimiento del hotel.",
                    "Movimientos de caja: revisa ingresos y egresos registrados.",
                    "Cajas, Conceptos de caja y Tipos de movimiento: mantienen los catálogos que se usan en las operaciones de caja."
                ]
            },
            {
                titulo: "Habitaciones y servicios",
                contenido: [
                    "Habitaciones: administra el inventario, categoría, piso, estado y tarifa de las habitaciones.",
                    "Productos y servicios: mantiene los productos y consumos adicionales disponibles para la operación.",
                    "Antes de registrar una estadía, verifica que la habitación y su estado sean correctos."
                ]
            },
            {
                titulo: "Recepción y reservas",
                contenido: [
                    "Check-in / Check-out: apoya el registro de ingreso y salida de huéspedes.",
                    "Reservas: registra la estadía, habitación, fechas, cliente y datos de pago.",
                    "Historial de reservas: consulta las reservas registradas.",
                    "Registro de consumo: agrega consumos asociados a una estadía.",
                    "Huéspedes: registra y mantiene los datos de las personas. Verifica los datos del documento antes de guardar."
                ]
            },
            {
                titulo: "Ventas, comprobantes, reportes y trazabilidad",
                contenido: [
                    "Ventas y Facturación: consulta las operaciones de venta y los comprobantes relacionados.",
                    "Facturas y Boletas: consulta los comprobantes emitidos.",
                    "Reportes: revisa información operativa y estadística disponible para tu rol.",
                    "Historial y trazabilidad: permite consultar eventos de auditoría cuando está habilitado."
                ]
            },
            {
                titulo: "Personal, organización y administración",
                contenido: [
                    "Empleados y Empresas mantienen información de organización utilizada por el hotel.",
                    "Departamentos y Provincias son catálogos geográficos.",
                    "Tipos de usuario, Módulos, Roles y Permisos por rol son catálogos administrativos; no los cambies sin autorización.",
                    "Usuarios permite al Administrador crear, consultar, editar y dar de baja cuentas del personal. Cada cuenta debe tener un solo rol."
                ]
            },
            {
                titulo: "Cómo usar los formularios CRUD",
                contenido: [
                    "Usa el buscador y los filtros para localizar un registro; el listado puede tener varias páginas.",
                    "Selecciona Nuevo para crear un registro, completa los campos obligatorios y guarda.",
                    "Usa Editar para corregir datos. En el formulario de Usuarios, deja la contraseña vacía si no deseas cambiarla.",
                    "Eliminar realiza una baja lógica: el registro deja de estar activo, no se borra físicamente de la base de datos. Algunas relaciones pueden impedir la operación.",
                    "Si aparece un error, revisa los campos obligatorios y las referencias seleccionadas. Si persiste, informa al administrador."
                ]
            },
            {
                titulo: "Roles y acceso",
                contenido: [
                    "Administrador: acceso administrativo completo, incluido el CRUD de Usuarios.",
                    "Gerente: clientes, recepción, habitaciones, caja, ventas y reportes.",
                    "Supervisor: clientes, recepción, habitaciones, caja y ventas.",
                    "Recepcionista: clientes, recepción y habitaciones.",
                    "Cajero: clientes, recepción, caja y ventas.",
                    "Operaciones/Limpieza: habitaciones.",
                    "Si necesitas un módulo que no aparece en tu menú, solicita al Administrador que revise tu rol."
                ]
            }
        ]
    },
    programador: {
        titulo: "Manual del programador",
        descripcion: "Mapa técnico para configurar, probar y mantener el sistema.",
        secciones: [
            {
                titulo: "Arquitectura",
                contenido: [
                    "Frontend: React con Create React App; el Dashboard muestra módulos como vistas dentro de la aplicación.",
                    "Backend: API Express en Node.js. Gestiona autenticación, permisos y las operaciones protegidas del CRUD de usuarios.",
                    "Base de datos: Supabase/PostgreSQL. La aplicación combina consultas Supabase desde el frontend con endpoints del backend para operaciones sensibles."
                ]
            },
            {
                titulo: "Puntos de entrada y archivos principales",
                contenido: [
                    "src/App.js: rutas, inicio de sesión y acceso al Dashboard.",
                    "src/views/Dashboard.jsx: navegación lateral, módulos disponibles según rol y Centro de ayuda.",
                    "src/config/entidades.js y src/components/CrudModule.jsx: definición y presentación de los CRUD reutilizables.",
                    "src/services/: comunicación con Supabase y con la API.",
                    "backend/server.js: inicio de Express y montaje de rutas.",
                    "backend/routes/, controllers/, services/, models/ y middleware/: rutas, controladores, lógica de negocio, consultas y autorización.",
                    "backend/migrations/: scripts SQL que se revisan y ejecutan manualmente."
                ]
            },
            {
                titulo: "Instalación y comandos",
                contenido: [
                    "Instala dependencias del frontend con npm install y las del backend con npm install --prefix backend.",
                    "npm start inicia frontend y backend para desarrollo local.",
                    "npm test ejecuta las pruebas del frontend; npm --prefix backend test ejecuta las pruebas del backend.",
                    "npm run test:e2e ejecuta pruebas de extremo a extremo; puede requerir instalar Chromium con npx playwright install chromium.",
                    "npm run build genera el frontend optimizado para publicación."
                ]
            },
            {
                titulo: "Configuración del entorno",
                contenido: [
                    "Frontend: configura REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_PUBLISHABLE_KEY; REACT_APP_API_URL es opcional y cambia la URL de la API.",
                    "Backend: configura SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY y SESSION_SECRET en backend/.env.",
                    "El CRUD protegido de Usuarios requiere SUPABASE_SERVICE_ROLE_KEY solo en el backend. FACTILIZA_TOKEN también se mantiene en backend/.env si se usa la consulta de documentos.",
                    "No publiques archivos .env, claves privadas, tokens ni credenciales. Las variables REACT_APP_* se incorporan al código enviado al navegador."
                ]
            },
            {
                titulo: "Usuarios, roles y datos",
                contenido: [
                    "La cuenta se guarda en la tabla usuario; las contraseñas nuevas usan hash scrypt en usuario_credencial.",
                    "La autorización del CRUD de usuarios se valida en backend/middleware/requireAdmin.js; los endpoints están en backend/routes/adminUsuariosRoutes.js.",
                    "La matriz de módulos por rol está en backend/models/permisosModel.js. El menú del frontend mejora la navegación, pero no sustituye la autorización del backend.",
                    "El servicio de CRUD genérico evita escribir cuentas de usuario directamente. No añadas columnas de contraseña a listados ni selecciones de uso general.",
                    "Las migraciones SQL son manuales y requieren revisión contra el esquema real y un respaldo antes de aplicarse."
                ]
            },
            {
                titulo: "Prácticas para cambios y soporte",
                contenido: [
                    "Antes de modificar un CRUD, revisa su entidad en src/config/entidades.js y los servicios que lo consumen.",
                    "Añade pruebas enfocadas al comportamiento nuevo y ejecuta las suites pertinentes, el build y git diff --check.",
                    "Al investigar un error, registra el mensaje, el endpoint o módulo y los pasos para reproducirlo; nunca registres contraseñas ni tokens.",
                    "Para cambios de base de datos, valida nombres de tablas y columnas en Supabase, conserva un respaldo y aplica el SQL de forma controlada."
                ]
            }
        ]
    }
};

const OPCIONES_AYUDA = [
    {
        clave: "usuario",
        titulo: "Manual de usuario",
        descripcion: "Aprende para qué sirve cada área y cómo completar las tareas frecuentes.",
        icono: "bi-person-vcard",
        claseIcono: "bg-blue-50 text-blue-700"
    },
    {
        clave: "programador",
        titulo: "Manual del programador",
        descripcion: "Consulta la arquitectura, configuración, pruebas y pautas de mantenimiento.",
        icono: "bi-code-slash",
        claseIcono: "bg-violet-50 text-violet-700"
    },
    {
        clave: "contacto",
        titulo: "Contacto y soporte",
        descripcion: "Qué información preparar y cómo solicitar ayuda con un problema.",
        icono: "bi-chat-dots",
        claseIcono: "bg-amber-50 text-amber-700"
    }
];

const CentroAyuda = () => {
    const [seccion, setSeccion] = useState("inicio");
    const manual = MANUALES[seccion];

    return (
        <div className="mx-auto max-w-6xl">
            <header className="mb-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    <i className="bi bi-life-preserver" aria-hidden="true"></i>
                    Guías y soporte
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Centro de ayuda</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Encuentra instrucciones para usar el sistema, orientación técnica y recomendaciones para pedir soporte.
                </p>
            </header>

            {seccion === "inicio" && (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {OPCIONES_AYUDA.map((opcion) => (
                        <button
                            key={opcion.clave}
                            type="button"
                            onClick={() => setSeccion(opcion.clave)}
                            className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                        >
                            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${opcion.claseIcono}`}>
                                <i className={`bi ${opcion.icono} text-xl`} aria-hidden="true"></i>
                            </span>
                            <span className="mt-5 block font-semibold text-slate-900">{opcion.titulo}</span>
                            <span className="mt-2 block text-sm leading-6 text-slate-600">{opcion.descripcion}</span>
                            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-800">
                                Abrir
                                <i className="bi bi-arrow-right" aria-hidden="true"></i>
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {manual && (
                <section aria-labelledby="titulo-manual">
                    <button
                        type="button"
                        onClick={() => setSeccion("inicio")}
                        className="mb-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                    >
                        <i className="bi bi-arrow-left" aria-hidden="true"></i>
                        Volver al centro de ayuda
                    </button>
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        <h2 id="titulo-manual" className="text-2xl font-bold text-slate-900">{manual.titulo}</h2>
                        <p className="mt-2 text-sm text-slate-600">{manual.descripcion}</p>
                        <div className="mt-6 space-y-3">
                            {manual.secciones.map((item) => (
                                <details key={item.titulo} className="group rounded-xl border border-slate-200">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-semibold text-slate-800">
                                        {item.titulo}
                                        <i className="bi bi-chevron-down text-sm text-slate-500 transition group-open:rotate-180" aria-hidden="true"></i>
                                    </summary>
                                    <ul className="space-y-2 border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-600">
                                        {item.contenido.map((texto) => (
                                            <li key={texto} className="flex gap-2">
                                                <i className="bi bi-check2 mt-1 text-blue-700" aria-hidden="true"></i>
                                                <span>{texto}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {seccion === "contacto" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="titulo-contacto">
                    <button
                        type="button"
                        onClick={() => setSeccion("inicio")}
                        className="mb-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                    >
                        <i className="bi bi-arrow-left" aria-hidden="true"></i>
                        Volver al centro de ayuda
                    </button>
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <i className="bi bi-chat-dots text-xl" aria-hidden="true"></i>
                        </span>
                        <div>
                            <h2 id="titulo-contacto" className="text-2xl font-bold text-slate-900">Contacto y soporte</h2>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                El correo y el teléfono de soporte todavía no están configurados. Por ahora, solicita el canal de contacto al Administrador del sistema o al responsable del hotel.
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 rounded-xl bg-slate-50 p-5">
                        <h3 className="font-semibold text-slate-900">Para recibir ayuda más rápido, indica:</h3>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                            <li>Tu usuario y el módulo donde ocurrió el problema.</li>
                            <li>Qué estabas intentando hacer y los pasos para repetirlo.</li>
                            <li>El mensaje de error y la hora aproximada.</li>
                            <li>Una captura, ocultando documentos personales u otra información sensible.</li>
                        </ul>
                    </div>
                    <p className="mt-5 flex gap-2 text-sm font-medium text-rose-700">
                        <i className="bi bi-shield-lock mt-0.5" aria-hidden="true"></i>
                        Nunca envíes contraseñas, tokens ni claves de Supabase por un canal de soporte.
                    </p>
                </section>
            )}
        </div>
    );
};

export default CentroAyuda;
