#!/usr/bin/env node

const net = require('net');
const { exec } = require('child_process');

const PORT = process.env.PORT || 4000;

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is in use
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false); // Port is free
    });
    
    server.listen(port);
  });
}

async function killProcessOnPort(port) {
  return new Promise((resolve, reject) => {
    // Try lsof first (macOS/Linux)
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (stdout.trim()) {
        const pids = stdout.trim().split('\n');
        console.log(`⚠️  Found ${pids.length} process(es) on port ${port}`);
        console.log(`🛑 Killing PIDs: ${pids.join(', ')}`);
        
        pids.forEach(pid => {
          try {
            process.kill(parseInt(pid), 'SIGTERM');
          } catch (e) {
            console.log(`   Failed to kill ${pid}: ${e.message}`);
          }
        });
        
        setTimeout(() => resolve(true), 1000);
      } else {
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log(`🔍 Checking if port ${PORT} is available...`);
  
  const inUse = await checkPort(PORT);
  
  if (inUse) {
    console.log(`❌ Port ${PORT} is already in use!`);
    console.log(`🔧 Attempting to free the port...`);
    
    await killProcessOnPort(PORT);
    
    // Wait a bit and check again
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stillInUse = await checkPort(PORT);
    if (stillInUse) {
      console.log(`❌ Could not free port ${PORT}. Please run:`);
      console.log(`   lsof -ti:${PORT} | xargs kill -9`);
      process.exit(1);
    } else {
      console.log(`✅ Port ${PORT} is now available!`);
    }
  } else {
    console.log(`✅ Port ${PORT} is available!`);
  }
}

main().catch(console.error);

