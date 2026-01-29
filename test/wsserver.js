const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuración del servidor
const PORT = process.env.PORT || 8443;
const HOST = process.env.HOST || 'localhost';

// Certificados SSL (puedes generar unos de prueba)
const serverOptions = {
    // Certificado autofirmado para testing
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.crt')),
    key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key')),
    // Para testing, permite conexiones no autorizadas
    rejectUnauthorized: false
};

// Función para generar certificado autofirmado si no existe
function generateSelfSignedCert() {
    console.log('⚠️  No se encontraron certificados SSL. Generando certificados autofirmados...');
    
    const forge = require('node-forge');
    const pki = forge.pki;
    
    // Generar par de claves
    const keys = pki.rsa.generateKeyPair(2048);
    
    // Crear certificado
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    const attrs = [{
        name: 'commonName',
        value: 'localhost'
    }, {
        name: 'countryName',
        value: 'ES'
    }, {
        shortName: 'ST',
        value: 'Madrid'
    }, {
        name: 'localityName',
        value: 'Madrid'
    }, {
        name: 'organizationName',
        value: 'Test'
    }];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([{
        name: 'basicConstraints',
        cA: true
    }, {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
    }, {
        name: 'subjectAltName',
        altNames: [{
            type: 2, // DNS
            value: 'localhost'
        }, {
            type: 7, // IP
            ip: '127.0.0.1'
        }]
    }]);
    
    // Firmar certificado
    cert.sign(keys.privateKey);
    
    // Crear directorio de certificados
    const certDir = path.join(__dirname, 'certs');
    if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
    }
    
    // Guardar certificados
    const certPem = pki.certificateToPem(cert);
    const keyPem = pki.privateKeyToPem(keys.privateKey);
    
    fs.writeFileSync(path.join(certDir, 'server.crt'), certPem);
    fs.writeFileSync(path.join(certDir, 'server.key'), keyPem);
    
    console.log('✅ Certificados autofirmados generados en:', certDir);
    
    return certPem;
}

// Versión simplificada sin node-forge (usando certificados existentes o creándolos manualmente)
function getServerOptions() {
    const certDir = path.join(__dirname, 'certs');
    const certPath = path.join(certDir, 'server.crt');
    const keyPath = path.join(certDir, 'server.key');
    
    try {
        return {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
            rejectUnauthorized: false
        };
    } catch (error) {
        console.log('⚠️  No se encontraron certificados SSL.');
        console.log('📋 Para generar certificados de prueba, ejecuta:');
        console.log(`
openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=ES/ST=Madrid/L=Madrid/O=Test/CN=localhost"
        `);
        console.log('🔧 O usa el script con certificados autofirmados básicos...');
        
        // Crear certificados básicos para testing
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }
        
        // Certificado y clave básicos (SOLO PARA TESTING)
        const basicCert = `-----BEGIN CERTIFICATE-----
MIIC2jCCAcKgAwIBAgIJAJ2+yPqG5rS+MA0GCSqGSIb3DQEBCwUAMDYxCzAJBgNV
BAYTAkVTMQ8wDQYDVQQIDAZNYWRyaWQxFjAUBgNVBAoMDVRlc3QgQ29tcGFueTAe
Fw0yNDAxMDEwMDAwMDBaFw0yNTAxMDEwMDAwMDBaMDYxCzAJBgNVBAYTAkVTMQ8w
DQYDVQQIDAZNYWRyaWQxFjAUBgNVBAoMDVRlc3QgQ29tcGFueTCCASIwDQYJKoZI
hvcNAQEBBQADggEPADCCAQoCggEBAMGvjzHdFpE9XK5L0gZ8jbQ9vH+KjF4L3S2x
-----END CERTIFICATE-----`;
        
        const basicKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDBr48x3RaRPVyu
S9IGfI20Pbx/ioxeC90tsSE7F8gL3+0K9S2L5FHjN3L8sF2Lx3K9vH+KjF4L3S2x
-----END PRIVATE KEY-----`;
        
        console.log('⚠️  Usando certificados de prueba básicos. NO usar en producción.');
        return {
            cert: basicCert,
            key: basicKey,
            rejectUnauthorized: false
        };
    }
}

// Crear servidor HTTPS
const server = https.createServer(getServerOptions());

// Crear servidor WebSocket sobre HTTPS
const wss = new WebSocket.Server({
    server,
    verifyClient: (info) => {
        console.log(`🔍 Cliente conectando desde: ${info.origin || 'unknown'}`);
        return true; // Permitir todas las conexiones para testing
    }
});

// Contador de conexiones
let connectionCount = 0;
const connections = new Map();

// Manejar conexiones WebSocket
wss.on('connection', (ws, req) => {
    const clientId = ++connectionCount;
    const clientInfo = {
        id: clientId,
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        connectedAt: new Date().toISOString()
    };
    
    connections.set(clientId, { ws, info: clientInfo });
    
    console.log(`🔗 Cliente ${clientId} conectado desde ${clientInfo.ip}`);
    console.log(`📊 Conexiones activas: ${connections.size}`);
    
    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
        type: 'welcome',
        clientId: clientId,
        message: 'Conectado al servidor WebSocket seguro',
        timestamp: new Date().toISOString(),
        server: {
            host: HOST,
            port: PORT,
            secure: true
        }
    }));
    
    // Manejar mensajes del cliente
    ws.on('message', (data) => {
        try {
            const message = data.toString();
            console.log(`📨 Mensaje del cliente ${clientId}:`, message);
            
            // Echo del mensaje con timestamp
            const response = {
                type: 'echo',
                clientId: clientId,
                originalMessage: message,
                timestamp: new Date().toISOString(),
                processed: true
            };
            
            ws.send(JSON.stringify(response));
            
            // Broadcast a otros clientes (opcional)
            if (message.startsWith('broadcast:')) {
                const broadcastMsg = {
                    type: 'broadcast',
                    from: clientId,
                    message: message.substring(10),
                    timestamp: new Date().toISOString()
                };
                
                connections.forEach((conn, id) => {
                    if (id !== clientId && conn.ws.readyState === WebSocket.OPEN) {
                        conn.ws.send(JSON.stringify(broadcastMsg));
                    }
                });
            }
            
        } catch (error) {
            console.error(`❌ Error procesando mensaje del cliente ${clientId}:`, error);
        }
    });
    
    // Manejar desconexión
    ws.on('close', () => {
        connections.delete(clientId);
        console.log(`❌ Cliente ${clientId} desconectado`);
        console.log(`📊 Conexiones activas: ${connections.size}`);
    });
    
    // Manejar errores
    ws.on('error', (error) => {
        console.error(`⚠️  Error en cliente ${clientId}:`, error.message);
    });
    
    // Ping/Pong para mantener conexión viva
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        } else {
            clearInterval(pingInterval);
        }
    }, 30000); // Cada 30 segundos
    
    ws.on('pong', () => {
        console.log(`💓 Pong recibido del cliente ${clientId}`);
    });
});

// Manejar errores del servidor WebSocket
wss.on('error', (error) => {
    console.error('❌ Error del servidor WebSocket:', error);
});

// Iniciar servidor
server.listen(PORT, HOST, () => {
    console.log('🚀 Servidor WebSocket Seguro iniciado');
    console.log(`🔒 WSS URL: wss://${HOST}:${PORT}`);
    console.log(`📋 Para testing con certificados autofirmados, usar: rejectUnauthorized: false`);
    console.log('');
    console.log('📝 Ejemplos de uso:');
    console.log('   • Mensaje normal: "Hola servidor"');
    console.log('   • Broadcast: "broadcast:Mensaje para todos"');
    console.log('');
    console.log('🛑 Para detener el servidor: Ctrl+C');
});

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    
    // Cerrar todas las conexiones
    connections.forEach((conn, id) => {
        conn.ws.close(1000, 'Servidor cerrando');
    });
    
    // Cerrar servidor
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});

// Estadísticas cada 30 segundos
setInterval(() => {
    if (connections.size > 0) {
        console.log(`📊 Estadísticas - Conexiones activas: ${connections.size}`);
    }
}, 30000);

module.exports = { server, wss };