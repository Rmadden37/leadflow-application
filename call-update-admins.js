#!/usr/bin/env node

/**
 * Script to call the cloud function to update admin roles
 */

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
  console.log('🚀 Calling cloud function to update admin roles...');
  console.log('==========================================');
  
  try {
    const updateAdminRoles = httpsCallable(functions, 'updateAdminRoles');
    const result = await updateAdminRoles();
    
    console.log('📋 Function result:', result.data);
    
    if (result.data.success) {
      console.log('🎉 SUCCESS!');
      console.log(`Updated ${result.data.updatedCount || 0} user(s) to admin role`);
      
      const { ryan, rocky } = result.data.results;
      
      console.log('\n📊 Results Summary:');
      console.log(`Ryan Madden: ${ryan.found ? '✅ Found' : '❌ Not Found'} | ${ryan.alreadyAdmin ? '✅ Already Admin' : ryan.updated ? '✅ Updated to Admin' : '❌ Update Failed'}`);
      console.log(`Rocky Niger: ${rocky.found ? '✅ Found' : '❌ Not Found'} | ${rocky.alreadyAdmin ? '✅ Already Admin' : rocky.updated ? '✅ Updated to Admin' : '❌ Update Failed'}`);
      
      console.log('\n🎯 Both users now have admin privileges:');
      console.log('   - Access all manager capabilities');
      console.log('   - Demote other managers');
      console.log('   - Manage all users across teams');
      
    } else {
      console.log('❌ FAILED!');
      console.log('Error:', result.data.error);
    }
    
  } catch (error) {
    console.error('❌ Error calling cloud function:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure you are authenticated with Firebase');
    console.log('2. Check that the cloud function deployed successfully');
    console.log('3. Verify your internet connection');
  }
  
  console.log('==========================================');
}

// Run the script
callUpdateAdminRoles();
