import { Client } from '@stomp/stompjs';
import { BACKEND_URL } from './api';

const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

let stompClient = null;
let onReportCallback = null;
let onUpdateCallback = null;
let onDeleteCallback = null;

export function connectWebSocket(onReport, onUpdate, onDelete) {
  onReportCallback = onReport;
  onUpdateCallback = onUpdate;
  onDeleteCallback = onDelete;

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

    // Escuchar reportes ELIMINADOS (ej: IA borró reporte basura con score 0)
    stompClient.subscribe('/topic/reports/deleted', (message) => {
      try {
        const reportId = Number(message.body);
        if (onDeleteCallback) onDeleteCallback(reportId);
      } catch (err) {
        console.error('Error parsing WebSocket delete:', err);
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
