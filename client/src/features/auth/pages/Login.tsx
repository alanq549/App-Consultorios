import Input from "../components/form/Input";
import { useLogin } from "../authHooks";

interface LoginProps {
  toggleFlip: () => void;
}

const Login = ({ toggleFlip }: LoginProps) => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    handleLogin,
  } = useLogin();

  return (
    // CAMBIO CLAVE: Glassmorphism Teal/White
<div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-8 space-y-6 transition-all duration-300">      
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-white">
          Iniciar Sesión
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Accede a tu historial y agenda de citas.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4">
          <Input
            type="email"
            label="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ejemplo@email.com"
          />

          <Input
            type="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-end">
          {/* CAMBIO: Color de acento a Teal */}
          <button
            type="button"
            className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors focus:outline-none"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {/* Botón principal con color Teal */}
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-slate-900 bg-teal-500 hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-200 shadow-md hover:shadow-lg shadow-teal-500/30"
        >
          {loading ? (
            <>
              {/* Ajuste de color del spinner a Teal */}
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Ingresando...
            </>
          ) : (
            "Ingresar"
          )}
        </button>

        {/* Manejo de errores */}
        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}
      </form>

      <div className="text-center">
        {/* Enlace de cambio de formulario */}
        <button
          type="button"
          onClick={toggleFlip}
          className="font-medium text-teal-400 hover:text-teal-300 transition-colors duration-200"
        >
          ¿No tienes cuenta? Regístrate
        </button>
      </div>
    </div>
  );
};

export default Login;