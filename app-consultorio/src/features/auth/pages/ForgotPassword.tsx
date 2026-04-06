import { useAuthActions } from "@/hooks/auth/useAuthActions"
import { useState } from "react"

export const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuthActions()

  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await forgotPassword(email)

    setSent(true)
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto text-center p-6">
        <h1 className="text-xl font-bold">
          Revisa tu correo
        </h1>

        <p className="mt-2 text-gray-500">
          Si existe una cuenta con ese correo, enviamos un enlace.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 space-y-4">

      <h1 className="text-xl font-bold">
        Recuperar contraseña
      </h1>

      <input
        type="email"
        placeholder="correo@ejemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded p-2"
      />

      <button className="w-full bg-blue-600 text-white p-2 rounded">
        Enviar enlace
      </button>

    </form>
  )
}