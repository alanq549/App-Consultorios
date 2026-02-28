import { Link } from "react-router-dom";
import { 
  CalendarDays, 
  Stethoscope, 
  ShieldCheck, 
  Users, 
  Star, 
  Clock, 
  MapPin, 
  Activity, 
  ArrowRight 
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-gray-50 relative overflow-hidden font-sans selection:bg-teal-500 selection:text-white">
      
      {/* --- Fondo Ambiental (Luces Médicas) --- */}
      {/* Luz superior central (Teal clínico) */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-teal-500/15 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      {/* Luz inferior derecha (Blanco estéril) */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />

      {/* --- Navbar Simulado (Para contexto) --- */}
      <nav className="relative z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <Activity size={20} className="text-white" />
            </div>
            MedLink<span className="text-teal-400">.</span>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-gray-300">
            <a href="#" className="hover:text-white transition">Especialistas</a>
            <a href="#" className="hover:text-white transition">Clínicas</a>
            <a href="#" className="hover:text-white transition">Seguros</a>
        </div>
        <Link to="/login" className="px-5 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium transition backdrop-blur-md">
            Acceso Pacientes
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-32 px-6 flex flex-col items-center justify-center text-center z-10">
        
        {/* Badge Flotante */}
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg shadow-teal-500/10 animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <span className="text-gray-300 text-xs font-semibold tracking-wide uppercase">Red de Consultorios Certificados</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-tight max-w-4xl">
          Tu salud merece <br/>
          <span className="relative whitespace-nowrap">
             <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">la mejor atención</span>
             {/* Subrayado decorativo Teal */}
             <div className="absolute -bottom-2 left-0 w-full h-3 bg-teal-500/20 -skew-x-12 blur-sm"></div>
          </span>
        </h1>
        
        <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto text-gray-400 leading-relaxed font-light">
          Accede a una red premium de consultorios y especialistas. 
          Agenda citas presenciales o virtuales con tecnología integrada.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            to={`/login?redirect=${encodeURIComponent("/client/schedule?foo=bar")}`}
            className="group bg-teal-500 hover:bg-teal-400 text-slate-900 px-8 py-4 rounded-2xl transition-all duration-300 font-bold flex items-center justify-center gap-3 shadow-[0_0_40px_-10px_rgba(20,184,166,0.5)] hover:shadow-[0_0_60px_-15px_rgba(20,184,166,0.6)] transform hover:-translate-y-1"
          >
            <CalendarDays size={20} className="group-hover:scale-110 transition-transform"/>
            Agendar Cita Ahora
          </Link>
          
          <Link
            to={`/login?redirect=${encodeURIComponent("/client/schedule?foo=bar")}`}
            className="group bg-white/5 backdrop-blur-xl border border-white/10 text-white px-8 py-4 rounded-2xl hover:bg-white/10 transition-all duration-300 font-medium flex items-center justify-center gap-2"
          >
            <MapPin size={20} className="text-teal-400 group-hover:text-teal-300 transition-colors" />
            Buscar Consultorios
          </Link>
        </div>

        {/* Stats Flotantes (Glass Cards Pequeñas) */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
            {[
                { label: "Pacientes Atendidos", val: "10k+" },
                { label: "Especialistas", val: "250+" },
                { label: "Consultorios", val: "45+" },
                { label: "Satisfacción", val: "99%" },
            ].map((stat, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.05] backdrop-blur-md p-4 rounded-xl text-center hover:bg-white/[0.06] transition-colors">
                    <div className="text-2xl font-bold text-white mb-1">{stat.val}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
                </div>
            ))}
        </div>
      </section>

      {/* Grid de Servicios / Beneficios (Estilo Bento Grid con mucha transparencia) */}
      <section className="py-24 px-6 relative z-10 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Experiencia Premium</h2>
                <p className="text-gray-400">Todo lo que necesitas para gestionar tu bienestar.</p>
            </div>
            <Link to="#" className="hidden md:flex items-center gap-2 text-teal-400 hover:text-white transition-colors mt-4 md:mt-0">
                Ver todos los beneficios <ArrowRight size={16} />
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card Principal Grande */}
            <div className="md:col-span-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full blur-[80px] -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-80"></div>
                <div className="relative z-10">
                    <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20">
                        <Users className="text-white" size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">Directorio Médico Verificado</h3>
                    <p className="text-gray-300 max-w-md leading-relaxed">
                        Accede a los perfiles detallados de más de 50 especialistas. Revisa sus credenciales, lee reseñas reales y conoce las instalaciones del consultorio antes de tu visita.
                    </p>
                </div>
            </div>

            {/* Card Vertical */}
            <div className="md:col-span-1 bg-white/[0.07] backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:border-teal-500/30 transition-colors group">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-500/20 transition-colors">
                    <Clock className="text-teal-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Disponibilidad 24/7</h3>
                <p className="text-gray-400 text-sm">
                    Nuestro sistema de agenda inteligente te permite reservar, reagendar o cancelar citas en cualquier momento.
                </p>
            </div>

            {/* Card Horizontal Baja */}
            <div className="md:col-span-1 bg-white/[0.07] backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:border-teal-500/30 transition-colors group">
                 <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-500/20 transition-colors">
                    <ShieldCheck className="text-teal-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Datos Encriptados</h3>
                <p className="text-gray-400 text-sm">Historial clínico protegido bajo estándares HIPAA.</p>
            </div>

            {/* Card con Imagen o Gráfico Abstracto */}
            <div className="md:col-span-2 bg-gradient-to-br from-teal-900/40 to-slate-900/40 backdrop-blur-xl border border-teal-500/20 p-8 rounded-3xl relative overflow-hidden group flex items-center">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-10"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-2">Telemedicina Integrada</h3>
                        <p className="text-teal-100/70 mb-6">
                            ¿No puedes ir al consultorio? Conéctate con tu doctor a través de nuestra plataforma de video de alta definición.
                        </p>
                        <button className="text-sm font-bold text-teal-400 uppercase tracking-wider hover:text-white transition-colors">
                            Conocer más &rarr;
                        </button>
                    </div>
                    {/* Elemento visual decorativo */}
                    <div className="w-32 h-32 rounded-full border-4 border-teal-500/30 flex items-center justify-center relative">
                        <div className="w-24 h-24 rounded-full bg-teal-500 animate-pulse flex items-center justify-center">
                            <Activity className="text-slate-900" size={32} />
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Especialidades (Style Clean White Glass) */}
      <section className="py-24 px-6 border-t border-white/5 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-4xl font-bold mb-4">Especialidades Destacadas</h2>
             <p className="text-gray-400 max-w-2xl mx-auto">Encuentra expertos en cada área de la medicina moderna.</p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { name: "Cardiología", icon: "❤️", desc: "Salud del corazón" },
              { name: "Pediatría", icon: "👶", desc: "Cuidado infantil" },
              { name: "Dermatología", icon: "✨", desc: "Cuidado de la piel" },
              { name: "Nutrición", icon: "🍎", desc: "Planes alimenticios" },
              { name: "Neurología", icon: "🧠", desc: "Sistema nervioso" },
              { name: "Odontología", icon: "🦷", desc: "Salud dental" },
            ].map((specialty) => (
              <div 
                key={specialty.name}
                className="group relative bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-sm p-6 rounded-2xl border border-white/[0.08] hover:border-teal-500/40 transition-all duration-300 cursor-pointer overflow-hidden"
              >
                {/* Glow effect on hover */}
                <div className="absolute -right-10 -top-10 w-20 h-20 bg-teal-500/20 rounded-full blur-2xl group-hover:bg-teal-500/40 transition-all"></div>
                
                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <h3 className="font-bold text-lg text-white mb-1 group-hover:text-teal-300 transition-colors">{specialty.name}</h3>
                        <p className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors">{specialty.desc}</p>
                    </div>
                    <span className="text-2xl grayscale group-hover:grayscale-0 transition-all transform group-hover:scale-110">{specialty.icon}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link 
              to="/client/schedule" 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 hover:border-teal-500 text-gray-300 hover:text-teal-400 transition-all text-sm font-medium"
            >
              Ver todas las 32 especialidades
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials (Cards Minimalistas) */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center text-white">Pacientes Satisfechos</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                quote: "La limpieza y modernidad de los consultorios me dio mucha confianza. Agendar fue cuestión de segundos.",
                author: "Sofía Martínez",
                role: "Paciente verificada",
                rating: 5
              },
              {
                quote: "Excelente plataforma. Pude enviar mis estudios previos al doctor antes de llegar a la consulta.",
                author: "Miguel Ángel R.",
                role: "Paciente recurrente",
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-md p-8 rounded-3xl border border-white/5 transition-colors relative">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="text-teal-500 fill-teal-500" />
                  ))}
                </div>
                <p className="text-lg text-gray-300 mb-6 font-light leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-900 font-bold text-lg">
                      {testimonial.author.charAt(0)}
                   </div>
                   <div>
                       <p className="font-bold text-white">{testimonial.author}</p>
                       <p className="text-xs text-teal-400/80 uppercase tracking-wide">{testimonial.role}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-10 px-6">
        <div className="max-w-5xl mx-auto relative rounded-[2rem] overflow-hidden border border-white/10">
            {/* Fondo complejo */}
            <div className="absolute inset-0 bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent"></div>
            
            <div className="relative z-10 px-8 py-20 text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white tracking-tight">Tu salud, simplificada.</h2>
              <p className="text-lg mb-10 max-w-xl mx-auto text-gray-400">
                Únete a la plataforma que está redefiniendo la experiencia en consultorios médicos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to={`/login?redirect=${encodeURIComponent("/client/schedule?foo=bar")}`}
                    className="bg-white text-slate-900 hover:bg-teal-50 px-10 py-4 rounded-xl transition-all duration-300 font-bold shadow-lg shadow-white/10"
                  >
                    Registrarme Gratis
                  </Link>
                  <button className="text-white border border-white/20 hover:bg-white/10 px-10 py-4 rounded-xl font-medium transition-all">
                    Soy Especialista
                  </button>
              </div>
            </div>
        </div>
      </section>
      
    </div>
  );
}