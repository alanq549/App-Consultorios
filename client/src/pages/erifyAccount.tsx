import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "../features/auth/authSlice";
import type { AppDispatch } from "../store";

export default function VerifyAccount() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verificando cuenta...");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch<AppDispatch>();


  const effectRan = useRef(false);

  useEffect(() => {
    if (effectRan.current) return; // evita doble ejecución en dev
  effectRan.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setMessage("Código de verificación no encontrado");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    fetch(`${import.meta.env.VITE_API_URL}/auth/verify?code=${code}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Error en la verificación");
        }
        return res.json();
      })
      .then((data) => {
        if (data.token && data.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          dispatch(setCredentials({ user: data.user, token: data.token }));
          
          setIsSuccess(true);
          setMessage("¡Cuenta verificada con éxito! Redirigiendo...");
          
          // Redirección basada en el rol
          setTimeout(() => {
            const role = data.user.role;
            if (role === "PROFESSIONAL") {
              navigate("/professional/dashboard");
            } else if (role === "CLIENT") {
              navigate("/client/dashboard");
            } else {
              setMessage("Rol no reconocido");
              setIsSuccess(false);
            }
          }, 2000);
        } else {
          throw new Error("Datos de verificación incompletos");
        }
      })
      .catch((err) => {
        console.error("Error al verificar:", err);
        setMessage(err.message || "Error al verificar tu cuenta");
        setIsSuccess(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [navigate, dispatch]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6 flex justify-center">
          {isLoading ? (
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          ) : isSuccess ? (
            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center mx-auto">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-10 w-10 text-teal-600 dark:text-teal-400" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-10 w-10 text-red-600 dark:text-red-400" 
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
          )}
        </div>

        <h1 className={`text-2xl font-bold mb-4 ${isSuccess ? 'text-teal-600 dark:text-teal-400' : 'text-gray-800 dark:text-gray-200'}`}>
          {message}
        </h1>

        {!isLoading && !isSuccess && (
          <div className="mt-6">
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        )}

        {isLoading && (
          <p className="text-gray-500 dark:text-gray-400 mt-4">
            Por favor espera, esto puede tomar unos segundos...
          </p>
        )}
      </div>
    </div>
  );
}