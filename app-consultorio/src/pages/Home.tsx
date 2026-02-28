import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow">
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4
                  flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-indigo-600">Consultorios</h1>

          <div className="flex gap-6">
            <Link to="/auth" className="text-lg font-semibold text-gray-900 cursor-pointer">
              Accesso
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenido a Nuestros Consultorios
          </h2>
          <p className="text-xl text-gray-600">
            Servicios de salud de calidad para tu bienestar
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Citas Médicas
            </h3>
            <p className="text-gray-600">
              Agenda tu cita con nuestros especialistas de forma fácil
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Especialistas
            </h3>
            <p className="text-gray-600">
              Conoce nuestro equipo de profesionales certificados
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Contacto
            </h3>
            <p className="text-gray-600">
              Comunícate con nosotros para más información
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
