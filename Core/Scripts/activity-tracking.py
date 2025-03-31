# BLACKVIRE - IP-Based Activity Tracking Backend
# ----------------------------------------------

import socket
import datetime
import sqlite3
import threading
import logging
import time
import ipaddress
from flask import Flask, jsonify, request
from flask_cors import CORS
import dns.resolver

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('BLACKVIRE')

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Database setup
def init_db():
    conn = sqlite3.connect('blackvire.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS device_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        mac_address TEXT,
        device_name TEXT,
        timestamp TEXT NOT NULL,
        request_type TEXT,
        domain TEXT,
        status TEXT
    )
    ''')
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

# Function to resolve domain name from IP
def resolve_domain(ip):
    try:
        domain_name = socket.gethostbyaddr(ip)[0]
        return domain_name
    except (socket.herror, socket.gaierror):
        try:
            # Try reverse DNS lookup
            addr = ipaddress.ip_address(ip)
            if addr.is_private:
                return "Private IP"
            query = '.'.join(reversed(str(addr).split('.'))) + '.in-addr.arpa'
            answers = dns.resolver.resolve(query, 'PTR')
            for rdata in answers:
                return str(rdata)
        except Exception:
            return "Unknown"

# Function to log device activity
def log_activity(ip_address, request_type=None, mac_address=None, device_name=None):
    try:
        conn = sqlite3.connect('blackvire.db')
        cursor = conn.cursor()
        timestamp = datetime.datetime.now().isoformat()
        domain = resolve_domain(ip_address)
        
        cursor.execute('''
        INSERT INTO device_activity 
        (ip_address, mac_address, device_name, timestamp, request_type, domain, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (ip_address, mac_address, device_name, timestamp, request_type, domain, "active"))
        
        conn.commit()
        conn.close()
        logger.info(f"Activity logged for IP: {ip_address}, Domain: {domain}")
        return True
    except Exception as e:
        logger.error(f"Error logging activity: {e}")
        return False

# Network scanner to detect devices
def scan_network(network_prefix="192.168.1"):
    try:
        logger.info(f"Starting network scan on prefix {network_prefix}")
        for i in range(1, 255):
            ip = f"{network_prefix}.{i}"
            # Using ping with timeout to check if device is alive
            response = os.system(f"ping -c 1 -W 1 {ip} > /dev/null 2>&1")
            if response == 0:
                logger.info(f"Device found at IP: {ip}")
                # Try to get MAC address (ARP table)
                try:
                    # This works on Linux systems
                    with open('/proc/net/arp', 'r') as f:
                        for line in f:
                            if ip in line:
                                mac = line.split()[3]
                                log_activity(ip, "ping", mac, "Unknown Device")
                                break
                except:
                    log_activity(ip, "ping", None, "Unknown Device")
    except Exception as e:
        logger.error(f"Error in network scan: {e}")

# API Endpoints
@app.route('/api/devices', methods=['GET'])
def get_devices():
    try:
        conn = sqlite3.connect('blackvire.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get the most recent entry for each IP
        cursor.execute('''
        SELECT * FROM device_activity 
        WHERE id IN (
            SELECT MAX(id) FROM device_activity GROUP BY ip_address
        )
        ORDER BY timestamp DESC
        ''')
        
        rows = cursor.fetchall()
        devices = [dict(row) for row in rows]
        conn.close()
        
        return jsonify({"status": "success", "devices": devices})
    except Exception as e:
        logger.error(f"Error retrieving devices: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/activity/<ip_address>', methods=['GET'])
def get_activity(ip_address):
    try:
        conn = sqlite3.connect('blackvire.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT * FROM device_activity 
        WHERE ip_address = ?
        ORDER BY timestamp DESC
        LIMIT 100
        ''', (ip_address,))
        
        rows = cursor.fetchall()
        activity = [dict(row) for row in rows]
        conn.close()
        
        return jsonify({"status": "success", "activity": activity})
    except Exception as e:
        logger.error(f"Error retrieving activity: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/log', methods=['POST'])
def manual_log():
    data = request.json
    if not data or 'ip_address' not in data:
        return jsonify({"status": "error", "message": "IP address is required"}), 400
    
    success = log_activity(
        data['ip_address'], 
        data.get('request_type'), 
        data.get('mac_address'), 
        data.get('device_name')
    )
    
    if success:
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "error", "message": "Failed to log activity"}), 500

@app.route('/api/scan', methods=['POST'])
def trigger_scan():
    data = request.json
    network = data.get('network', "192.168.1")
    
    # Start scan in background thread
    threading.Thread(target=scan_network, args=(network,)).start()
    
    return jsonify({"status": "success", "message": f"Scan started on network {network}"})

# Main function
if __name__ == "__main__":
    import os
    init_db()
    
    # Start a background thread for periodic network scanning
    def periodic_scan():
        while True:
            scan_network()
            time.sleep(3600)  # scan every hour
    
    scan_thread = threading.Thread(target=periodic_scan)
    scan_thread.daemon = True
    scan_thread.start()
    
    # Start the Flask app
    app.run(host='0.0.0.0', port=5200, debug=True)