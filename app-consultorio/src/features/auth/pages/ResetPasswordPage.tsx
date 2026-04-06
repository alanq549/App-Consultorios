import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthActions } from "@/hooks/auth/useAuthActions";
import { useState } from "react";

export const ResetPasswordPage = () => {
  const [search] = useSearchParams();
  const token = search.get("token");

  const navigate = useNavigate();

  const { resetPassword } = useAuthActions();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-xl font-bold">Token inválido</h1>
        <p>El enlace de recuperación no es válido.</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(token, password);

      alert("Contraseña actualizada");

      navigate("/auth");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al actualizar la contraseña");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Nueva contraseña</h1>

      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border rounded p-2"
      />

      {error && <p className="text-red-500 mt-2">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-4 w-full bg-blue-600 text-white p-2 rounded"
      >
        {loading ? "Actualizando..." : "Restablecer contraseña"}
      </button>
    </div>
  );
};
