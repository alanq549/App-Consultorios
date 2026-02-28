import { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import { ErrorBoundary } from "react-error-boundary";
// Importar componentes de Framer Motion
import { AnimatePresence, motion } from "framer-motion";

export default function AuthPage() {
  const [showLogin, setShowLogin] = useState(true);

  const toggleForm = () => setShowLogin(!showLogin);

  // Determinar la clase de tamaño del contenedor
  // El Registro es más grande si es perfil profesional
  const containerSizeClass = showLogin ? "max-w-md" : "max-w-xl";

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 flex items-center justify-center p-4">
      {/* Luces de fondo opcionales */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-teal-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Contenedor animado:
        1. Usamos 'overflow-hidden' para que los componentes se deslicen dentro del contenedor.
        2. La clase de tamaño se ajusta dinámicamente para que el contenedor crezca cuando el registro profesional lo requiera.
      */}
      <div className={`relative z-10 w-full ${containerSizeClass} transition-all duration-500 ease-in-out`}>
        <AnimatePresence mode="wait">
          <ErrorBoundary
            key={showLogin ? "login" : "register"} // Key es CRUCIAL para AnimatePresence
            fallback={
              <div className="p-6 bg-red-900/50 text-white rounded-xl backdrop-blur-md border border-red-500">
                <p className="font-bold">Error de carga.</p>
                <p className="text-sm">Algo falló. Intenta más tarde.</p>
              </div>
            }
          >
            {showLogin ? (
              // Componente de Login animado
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <Login toggleFlip={toggleForm} />
              </motion.div>
            ) : (
              // Componente de Registro animado
              <motion.div
                key="register-form"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3 }}
              >
                <Register toggleFlip={toggleForm} />
              </motion.div>
            )}
          </ErrorBoundary>
        </AnimatePresence>
      </div>
    </div>
  );
}