import { Client } from '@stomp/stompjs';
import { BACKEND_URL } from './api';

const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

let stompClient = null;
let onReportCallback = null;
let onUpdateCallback = null;

export function connectWebSocket(onReport, onUpdate) {
  onReportCallback = onReport;
  onUpdateCallback = onUpdate;

  stompClient = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  stompClient.onConnect = () => {
    // Escuchar reportes NUEVOS
    stompClient.subscribe('/topic/reports/ALL', (message) => {
      try {
        const report = JSON.parse(message.body);
        if (onReportCallback) onReportCallback(report);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    });

    // Escuchar reportes ACTUALIZADOS (ej: IA cambió status a VERIFIED)
    stompClient.subscribe('/topic/reports/updated', (message) => {
      try {
        const report = JSON.parse(message.body);
        if (onUpdateCallback) onUpdateCallback(report);
      } catch (err) {
        console.error('Error parsing WebSocket update:', err);
      }
    });
  };

  stompClient.onStompError = (frame) => {
    console.error('STOMP error:', frame.headers?.message);
  };

  stompClient.activate();
  return stompClient;
}

export function disconnectWebSocket() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }
}

export function isConnected() {
  return stompClient?.connected || false;
}
