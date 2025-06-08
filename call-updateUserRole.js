const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase config (you can use any valid config for cloud functions)
const firebaseConfig = {
  projectId: 'leadflow-4lvrr',
  // Other fields aren't needed for functions calls
};

async function updateRyanToAdmin() {
  try {
    console.log('🚀 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const functions = getFunctions(app);
    
    // Get the updateUserRole function
    const updateUserRole = httpsCallable(functions, 'updateUserRole');
    
    console.log('📞 Calling updateUserRole function for Ryan...');
    
    // Call the function with Ryan's details
    const result = await updateUserRole({
      email: 'ryan@studiostormchasers.com', // Assuming this is Ryan's email
      targetRole: 'admin',
      teamId: 'empire' // Using empire team as default
    });
    
    console.log('✅ Function result:', result.data);
    
  } catch (error) {
    console.error('❌ Error calling updateUserRole:', error);
    console.error('Error details:', error.code, error.message);
  }
}

updateRyanToAdmin();
