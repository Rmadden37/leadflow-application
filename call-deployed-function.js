#!/usr/bin/env node

/**
 * Script to directly call the deployed cloud function
 */

const https = require('https');

async function callUpdateAdminRoles() {
  console.log('🚀 Calling deployed cloud function to update admin roles...');
  console.log('==========================================');
  
  const options = {
    hostname: 'us-central1-leadflow-4lvrr.cloudfunctions.net',
    path: '/updateAdminRoles',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📋 Function response:', data);
        try {
          const result = JSON.parse(data);
          if (result.error) {
            console.log('❌ Function returned error:', result.error);
          } else {
            console.log('✅ Function executed successfully');
            console.log('Result:', result);
          }
          resolve(result);
        } catch (error) {
          console.log('📄 Raw response:', data);
          resolve(data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error calling function:', error.message);
      reject(error);
    });
    
    // Send empty data for callable function
    req.write(JSON.stringify({ data: {} }));
    req.end();
  });
}

// Run the script
callUpdateAdminRoles()
  .then(() => {
    console.log('==========================================');
    console.log('🎉 Admin role update process completed!');
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
