import { useNavigate } from 'react-router-dom';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <h1 style={styles.title}>404</h1>
                <h2 style={styles.subtitle}>Página no encontrada</h2>
                <p style={styles.description}>
                    Lo sentimos, la página que buscas no existe.
                </p>
                <button 
                    onClick={() => navigate('/')}
                    style={styles.button}
                >
                    Volver al inicio
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
    },
    content: {
        textAlign: 'center' as const,
        padding: '40px',
    },
    title: {
        fontSize: '72px',
        fontWeight: 'bold',
        color: '#333',
        margin: '0',
    },
    subtitle: {
        fontSize: '24px',
        color: '#666',
        marginTop: '10px',
    },
    description: {
        fontSize: '16px',
        color: '#999',
        marginTop: '20px',
    },
    button: {
        marginTop: '30px',
        padding: '12px 30px',
        fontSize: '16px',
        backgroundColor: '#0066cc',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
};