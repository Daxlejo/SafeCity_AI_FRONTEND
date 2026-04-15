import { Client } from '@stomp/stompjs';
import { BACKEND_URL } from './api';

const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

let stompClient = null;
let onReportCallback = null;

export function connectWebSocket(onReport) {
  onReportCallback = onReport;

  stompClient = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  stompClient.onConnect = () => {
    stompClient.subscribe('/topic/reports/ALL', (message) => {
      try {
        const report = JSON.parse(message.body);
        if (onReportCallback) onReportCallback(report);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
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
