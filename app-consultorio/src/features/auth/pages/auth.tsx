// src/features/auth/pages/auth.tsx

import { useState } from "react"
import LoginForm from "../components/LoginForm"
import RegisterForm from "../components/RegisterForm"
import { useAuthRedirect } from "@/hooks/auth/useAuthRedirect"

export default function AuthPage() {
  useAuthRedirect()

  const [mode, setMode] = useState<"login" | "register">("login")

  return (
    <div className="min-h-screen flex items-center justify-center 
                    bg-gray-100 dark:bg-gray-950 
                    transition-colors duration-300 px-4">

      <div className="w-full max-w-md space-y-6">

        {mode === "login" ? <LoginForm /> : <RegisterForm />}

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={() =>
              setMode(mode === "login" ? "register" : "login")
            }
            className="text-indigo-600 hover:underline font-medium"
          >
            {mode === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>

      </div>
    </div>
  )
}