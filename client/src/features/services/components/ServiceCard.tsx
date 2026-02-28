import type { UpdateServiceDTO } from "../types";

interface Props {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  onEdit: (id: string, data: UpdateServiceDTO) => void;
  onDelete: (id: string) => void;
}

export default function ServiceCard({
  id,
  name,
  description,
  durationMinutes,
  price,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-zinc-800/80">
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-gray-800 dark:text-zinc-100">{name}</h3>
        <p className="text-gray-600 dark:text-zinc-300">{description}</p>
        
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{durationMinutes} min</span>
          </div>
          
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>${price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
        <button
          className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 
                     dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-zinc-700  rounded-md transition-colors"
          onClick={() => onEdit(id, { name, description, durationMinutes, price })}
        >
          Editar
        </button>
        <button 
          className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 
                     dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-zinc-700 rounded-md transition-colors"
          onClick={() => onDelete(id)}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}