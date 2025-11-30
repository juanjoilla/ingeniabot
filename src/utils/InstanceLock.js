// src/utils/instanceLock.js
const fs = require('fs');
const path = require('path');

class InstanceLock {
  constructor() {
    this.lockFile = path.join(__dirname, '../../.instance.lock');
    this.lockAcquired = false;
  }

  async acquire() {
    try {
      if (fs.existsSync(this.lockFile)) {
        const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
        const lockAge = Date.now() - lockData.timestamp;
        
        if (lockAge > 5 * 60 * 1000) {
          console.log('🔓 Lock antiguo encontrado, eliminando...');
          fs.unlinkSync(this.lockFile);
        } else {
          console.error('❌ Ya hay otra instancia del bot corriendo');
          console.error(`   PID: ${lockData.pid}`);
          console.error(`   Inicio: ${new Date(lockData.timestamp).toLocaleString()}`);
          return false;
        }
      }

      const lockData = {
        pid: process.pid,
        timestamp: Date.now(),
        hostname: require('os').hostname()
      };
      
      fs.writeFileSync(this.lockFile, JSON.stringify(lockData, null, 2));
      this.lockAcquired = true;
      
      console.log('✅ Instance lock adquirido');
      console.log(`   PID: ${process.pid}`);
      
      return true;
      
    } catch (error) {
      console.error('Error al adquirir lock:', error.message);
      return false;
    }
  }

  release() {
    if (this.lockAcquired && fs.existsSync(this.lockFile)) {
      try {
        fs.unlinkSync(this.lockFile);
        console.log('🔓 Instance lock liberado');
        this.lockAcquired = false;
      } catch (error) {
        console.error('Error al liberar lock:', error.message);
      }
    }
  }
}

module.exports = new InstanceLock();