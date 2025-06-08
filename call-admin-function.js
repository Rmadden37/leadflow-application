const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase configuration
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
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

async function callUpdateAdminRoles() {
  console.log('🚀 Calling updateAdminRoles cloud function...');
  
  try {
    const updateAdminRoles = httpsCallable(functions, 'updateAdminRoles');
    const result = await updateAdminRoles();
    
    console.log('✅ Function result:', result.data);
    
    if (result.data.success) {
      console.log('🎉 Admin roles updated successfully!');
      console.log('Results:', result.data.results);
    } else {
      console.log('❌ Function failed:', result.data.error);
    }
    
  } catch (error) {
    console.error('❌ Error calling function:', error);
  }
}

callUpdateAdminRoles();
