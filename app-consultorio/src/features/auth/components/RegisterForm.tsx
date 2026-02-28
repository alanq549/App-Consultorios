// src/features/auth/components/RegisterForm.tsx
import { useState } from 'react'
import { useAuthActions } from '@/hooks/auth/useAuthActions'

import type { Role } from '@/types/auth.types'
import { AxiosError } from 'axios'

export default function RegisterForm() {
  const { register } = useAuthActions()

  const [role, setRole] = useState<Role>('CLIENT')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // profile base
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  // solo profesional
  const [specialtyId, setSpecialtyId] = useState<number | ''>('')
  const [description, setDescription] = useState('')

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    if (role === 'CLIENT') {
      await register({
        email,
        password,
        role,
        profile: {
          name,
          lastName,
          phone
        }
      })
    }

    if (role === 'PROFESSIONAL') {
      if (!specialtyId) {
        alert('Selecciona una especialidad')
        return
      }

      await register({
        email,
        password,
        role,
        profile: {
          name,
          lastName,
          phone,
          specialtyId,
          description
        }
      })
    }

    // ✅ Esto se ejecuta siempre que register no falle
    alert('Usuario registrado correctamente. Revisa tu correo para verificar.')

    // Reset de campos
    setEmail('')
    setPassword('')
    setName('')
    setLastName('')
    setPhone('')
    setSpecialtyId('')
    setDescription('')
    setRole('CLIENT')

    } catch (err: unknown) {
    // ✅ Ahora TypeScript te obliga a chequear el tipo
    if (err instanceof AxiosError) {
      alert(err.response?.data?.message || 'Error al registrar usuario')
    } else if (err instanceof Error) {
      alert(err.message)
    } else {
      alert('Error desconocido')
    }
  }
}
  // Estilo común para los inputs
  const inputStyles = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
  const labelStyles = "block text-sm font-semibold text-gray-700 mb-1";
return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">Crea tu cuenta</h2>
        <p className="text-gray-500 mt-2">Únete a nuestra comunidad hoy mismo</p>
      </div>

      {/* Selector de Rol Mejorado */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-8">
        <button
          type="button"
          onClick={() => setRole('CLIENT')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${role === 'CLIENT' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Soy Cliente
        </button>
        <button
          type="button"
          onClick={() => setRole('PROFESSIONAL')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${role === 'PROFESSIONAL' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Soy Profesional
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección: Información Personal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
             <label className={labelStyles}>Email</label>
             <input type="email" placeholder="ejemplo@correo.com" value={email} onChange={e => setEmail(e.target.value)} className={inputStyles} required />
          </div>
          
          <div>
            <label className={labelStyles}>Nombre</label>
            <input type="text" placeholder="Juan" value={name} onChange={e => setName(e.target.value)} className={inputStyles} required />
          </div>
          
          <div>
            <label className={labelStyles}>Apellido</label>
            <input type="text" placeholder="Pérez" value={lastName} onChange={e => setLastName(e.target.value)} className={inputStyles} required />
          </div>

          <div>
            <label className={labelStyles}>Contraseña</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className={inputStyles} required />
          </div>

          <div>
            <label className={labelStyles}>Teléfono</label>
            <input type="tel" placeholder="+56 9..." value={phone} onChange={e => setPhone(e.target.value)} className={inputStyles} required />
          </div>
        </div>

        {/* Sección Dinámica: Profesional */}
        {role === 'PROFESSIONAL' && (
          <div className="pt-4 border-t border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <h3 className="font-bold text-gray-800">Información Profesional</h3>
            <div>
              <label className={labelStyles}>ID Especialidad</label>
              <input 
                type="number" 
                value={specialtyId} 
                onChange={e => setSpecialtyId(Number(e.target.value))} 
                className={inputStyles} 
                placeholder="Ej: 1"
              />
            </div>
            <div>
              <label className={labelStyles}>Descripción / Bio</label>
              <textarea 
                rows={3}
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className={`${inputStyles} resize-none`}
                placeholder="Cuéntanos sobre tu experiencia..."
              />
            </div>
          </div>
        )}

        <button 
          type="submit" 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98]"
        >
          Finalizar Registro
        </button>
      </form>
    </div>
  )
}