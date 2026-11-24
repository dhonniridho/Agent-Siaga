import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TeacherDashboard } from './components/TeacherDashboard';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

function RootRouter() {
  const [isTeacher, setIsTeacher] = useState(() => {
    return (
      window.location.pathname.startsWith('/guru') ||
      window.location.hash.startsWith('#/guru') ||
      window.location.hash.startsWith('#guru')
    );
  });

  useEffect(() => {
    const checkRoute = () => {
      setIsTeacher(
        window.location.pathname.startsWith('/guru') ||
        window.location.hash.startsWith('#/guru') ||
        window.location.hash.startsWith('#guru')
      );
    };

    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  return isTeacher ? <TeacherDashboard /> : <App />;
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootRouter />
  </React.StrictMode>
);
