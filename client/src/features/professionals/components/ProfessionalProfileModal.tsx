import Modal from "./Modal";
import CertificatesDisplay from "@/components/CertificatesDisplay";
import type { ProfessionalProfile, User } from "@/features/Admin/admin.types";

type Props = {
  professional: ProfessionalProfile & { user: Pick<User, "name" | "lastName" | "avatar"> };
  onClose: () => void;
};

const staticUrl = import.meta.env.VITE_STATIC_URL;

export default function ProfessionalProfileModal({ professional, onClose }: Props) {
  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sección izquierda - Avatar e info básica */}
        <div className="flex-shrink-0 text-center md:text-left">
          <div className="w-40 h-40 mx-auto md:mx-0 rounded-full overflow-hidden border-4 border-white shadow-lg ml-15">
            <img 
              src={`${staticUrl}${professional.user.avatar}`} 
              alt={`${professional.user.name} ${professional.user.lastName}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/default-avatar.jpg';
              }}
              loading="lazy"
            />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-4">
            {professional.user.name} {professional.user.lastName}
          </h2>

          {/* Redes sociales */}
          {professional.socialLinks && Object.keys(professional.socialLinks).length > 0 && (
            <div className="mt-4 mb-4">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Redes sociales</h3>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {Object.entries(professional.socialLinks).map(([platform, url]) => (
                  <a 
                    key={platform}
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full text-sm flex items-center gap-2 transition-colors"
                    aria-label={`Abrir ${platform} de ${professional.user.name}`}
                  >
                    <span className="text-indigo-600 dark:text-zinc-300 font-semibold capitalize">{platform}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

            {/* Descripción */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Sobre mí</h3>
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {professional.description || "Este profesional no ha añadido una descripción todavía."}
            </p>
          </section>
        </div>

        {/* Sección derecha - Info detallada */}
        <div className="flex-grow space-y-6">
        

          {/* Certificados */}
          <section>
            <CertificatesDisplay existingCertificates={professional.certificates || []} />
          </section>

          {/* Reseñas */}
          <section className="border-t border-gray-200 dark:border-zinc-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Reseñas</h3>
            {professional.reviews && professional.reviews.length > 0 ? (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {professional.reviews.map((review) => (
                  <article 
                    key={review.id} 
                    className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg shadow-sm"
                    aria-label={`Reseña de ${review.client.name} ${review.client.lastName}`}
                  >
                    <div className="flex items-center mb-2">
                      <div className="flex text-yellow-400 mr-3" aria-hidden="true">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {review.rating}/5
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-1">
                      {review.comment || "El cliente no dejó un comentario."}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium italic">
                      - {review.client.name} {review.client.lastName}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No hay reseñas disponibles todavía.</p>
            )}
          </section>
        </div>
      </div>

      {/* Botón cerrar */}
      <div className="mt-8 flex justify-end">
        <button 
          onClick={onClose} 
          className="px-6 py-2 bg-zinc-700 hover:bg-zinc-800 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Cerrar perfil profesional"
        >
          Cerrar
        </button>
      </div>
    </Modal>

  );
}
