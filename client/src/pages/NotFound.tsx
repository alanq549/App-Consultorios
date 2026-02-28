import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1); // Va a la página anterior en el historial
  };

  const handleGoHome = () => {
    navigate("/"); // Va a la página principal
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gradient-to-br from-teal-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-gray-200 px-4">
      <div className="text-center max-w-2xl">
        {/* Ilustración SVG con color teal */}
        <div className="mx-auto mb-8 w-64 h-64">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-full h-full">
            <path 
              fill="#0d9488" // Color teal-600
              d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 464c-114.7 0-208-93.3-208-208S141.3 48 256 48s208 93.3 208 208-93.3 208-208 208zm-80-304c0-8.8 7.2-16 16-16h160c8.8 0 16 7.2 16 16s-7.2 16-16 16H192c-8.8 0-16-7.2-16-16zm0 64c0-8.8 7.2-16 16-16h160c8.8 0 16 7.2 16 16s-7.2 16-16 16H192c-8.8 0-16-7.2-16-16zm0 64c0-8.8 7.2-16 16-16h160c8.8 0 16 7.2 16 16s-7.2 16-16 16H192c-8.8 0-16-7.2-16-16z"
            />
          </svg>
        </div>
        
        <h1 className="text-8xl font-bold mb-6 text-teal-600 dark:text-teal-400">404</h1>
        <h2 className="text-3xl font-semibold mb-4">¡Ups! Página no encontrada</h2>
        
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
          Puedes volver atrás o ir a la página de inicio.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center shadow-md hover:shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Volver atrás
          </button>
          
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 border border-teal-600 dark:border-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center shadow-md hover:shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;