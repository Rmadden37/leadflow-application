// Firebase messaging service worker for push notifications
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration - same as your main app
const firebaseConfig = {
  apiKey: "AIzaSyBc3jmFE6dRXBApmWD9Jg2PO86suqGgaZw",
  authDomain: "leadflow-4lvrr.firebaseapp.com",
  projectId: "leadflow-4lvrr",
  storageBucket: "leadflow-4lvrr.firebasestorage.app",
  messagingSenderId: "13877630896",
  appId: "1:13877630896:web:ab7d2717024960ec36e875",
  measurementId: "G-KDEF2C21SH",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'LeadFlow Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: payload.data?.type || 'leadflow-notification',
    data: payload.data,
    actions: getNotificationActions(payload.data?.type),
    requireInteraction: payload.data?.priority === 'high',
    vibrate: [200, 100, 200],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Define notification actions based on type
function getNotificationActions(type) {
  switch (type) {
    case 'new_lead':
      return [
        { action: 'view', title: 'View Lead', icon: '/icon-192x192.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icon-192x192.png' }
      ];
    case 'lead_assigned':
      return [
        { action: 'accept', title: 'Accept', icon: '/icon-192x192.png' },
        { action: 'view', title: 'View Details', icon: '/icon-192x192.png' }
      ];
    case 'appointment_reminder':
      return [
        { action: 'view', title: 'View Appointment', icon: '/icon-192x192.png' },
        { action: 'snooze', title: 'Remind in 15 min', icon: '/icon-192x192.png' }
      ];
    default:
      return [
        { action: 'view', title: 'View', icon: '/icon-192x192.png' }
      ];
  }
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  // Handle different actions
  let url = '/dashboard';
  
  switch (action) {
    case 'view':
    case 'accept':
      if (data?.leadId) {
        url = `/dashboard?leadId=${data.leadId}`;
      } else if (data?.url) {
        url = data.url;
      }
      break;
    case 'snooze':
      // Handle snooze action - could trigger another notification
      scheduleSnoozeNotification(data);
      return;
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (url !== '/dashboard') {
            client.navigate(url);
          }
          return;
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Schedule a snooze notification (simplified version)
function scheduleSnoozeNotification(data) {
  // In a real implementation, you'd want to use the Notifications API
  // or trigger a server-side scheduled notification
  setTimeout(() => {
    self.registration.showNotification('Reminder: Appointment Soon', {
      body: data?.body || 'Your appointment is coming up soon',
      icon: '/icon-192x192.png',
      tag: 'snooze-reminder',
      data: data
    });
  }, 15 * 60 * 1000); // 15 minutes
}
