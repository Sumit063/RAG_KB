import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App';
import { theme } from './theme';
import './styles.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" />
        <App />
      </MantineProvider>
    </React.StrictMode>
  );
}
