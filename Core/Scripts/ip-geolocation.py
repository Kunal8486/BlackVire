#!/usr/bin/env python3
import json
import sys
import time
import select
import requests
import sqlite3
import os
from datetime import datetime, timedelta

class IPGeolocation:
    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ip_cache.db')
        self.init_db()
    
    def init_db(self):
        """Initialize SQLite database for caching IP geolocation data."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create table if it doesn't exist
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS ip_cache (
                ip TEXT PRIMARY KEY,
                country TEXT,
                city TEXT,
                latitude REAL,
                longitude REAL,
                isp TEXT,
                timestamp DATETIME
            )
            ''')
            
            conn.commit()
            conn.close()
            
            self.send_message('info', 'Geolocation cache initialized')
        except Exception as e:
            self.send_message('error', f'Failed to initialize database: {str(e)}')
    
    def get_ip_info(self, ip):
        """Get geolocation info for an IP address, using cache if available."""
        # Check cache first
        cached_data = self.get_from_cache(ip)
        if cached_data:
            self.send_message('geo_data', {'ip': ip, 'source': 'cache', **cached_data})
            return cached_data
        
        # If not in cache, fetch from API
        try:
            # Using free IP-API service
            response = requests.get(f'http://ip-api.com/json/{ip}', timeout=5)
            data = response.json()
            
            if response.status_code == 200 and data.get('status') == 'success':
                geo_data = {
                    'country': data.get('country', 'Unknown'),
                    'city': data.get('city', 'Unknown'),
                    'latitude': data.get('lat'),
                    'longitude': data.get('lon'),
                    'isp': data.get('isp', 'Unknown')
                }
                
                # Cache the result
                self.add_to_cache(ip, geo_data)
                
                self.send_message('geo_data', {'ip': ip, 'source': 'api', **geo_data})
                return geo_data
            else:
                self.send_message('warning', f'Could not get geolocation for IP: {ip}')
                return None
                
        except Exception as e:
            self.send_message('error', f'API request failed: {str(e)}')
            return None
    
    def get_from_cache(self, ip):
        """Retrieve IP data from cache if available and not expired."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get data from cache, only if not older than 30 days
            cursor.execute('''
            SELECT country, city, latitude, longitude, isp, timestamp
            FROM ip_cache
            WHERE ip = ? AND timestamp > ?
            ''', (ip, (datetime.now() - timedelta(days=30)).isoformat()))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return {
                    'country': result[0],
                    'city': result[1],
                    'latitude': result[2],
                    'longitude': result[3],
                    'isp': result[4],
                    'timestamp': result[5]
                }
            return None
            
        except Exception as e:
            self.send_message('error', f'Cache retrieval error: {str(e)}')
            return None
    
    def add_to_cache(self, ip, data):
        """Add IP geolocation data to cache."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
            INSERT OR REPLACE INTO ip_cache 
            (ip, country, city, latitude, longitude, isp, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                ip,
                data.get('country'),
                data.get('city'),
                data.get('latitude'),
                data.get('longitude'),
                data.get('isp'),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            self.send_message('error', f'Cache update error: {str(e)}')
    
    def process_ip_batch(self, ips):
        """Process a batch of IP addresses."""
        results = {}
        for ip in ips:
            results[ip] = self.get_ip_info(ip)
            # Add a small delay to avoid rate limiting
            time.sleep(0.1)
        
        self.send_message('batch_complete', {'count': len(results)})
        return results
    
    def send_message(self, msg_type, data):
        """Send message to the Node.js server."""
        if isinstance(data, dict):
            message = {'type': msg_type, **data}
        else:
            message = {'type': msg_type, 'message': data}
        
        print(json.dumps(message))
        sys.stdout.flush()
    
    def process_command(self, command):
        """Process command from Node.js server."""
        cmd = command.get('command')
        
        if cmd == 'lookup_ip':
            ip = command.get('ip')
            if ip:
                self.get_ip_info(ip)
            else:
                self.send_message('error', 'No IP address provided')
        
        elif cmd == 'lookup_batch':
            ips = command.get('ips', [])
            if ips:
                self.process_ip_batch(ips)
            else:
                self.send_message('error', 'No IP addresses provided in batch')
        
        elif cmd == 'clear_cache':
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute('DELETE FROM ip_cache')
                count = cursor.rowcount
                conn.commit()
                conn.close()
                self.send_message('info', f'Cache cleared: {count} entries removed')
            except Exception as e:
                self.send_message('error', f'Failed to clear cache: {str(e)}')
        
        elif cmd == 'ping':
            self.send_message('pong', {'timestamp': time.time()})
        
        else:
            self.send_message('error', f'Unknown command: {cmd}')

def main():
    # Initialize geolocation service
    geo_service = IPGeolocation()
    
    # Send startup message
    geo_service.send_message('startup', {'status': 'ready'})
    
    # Process stdin commands from Node.js
    while True:
        # Check if there's input from stdin (non-blocking)
        if select.select([sys.stdin], [], [], 0.1)[0]:
            try:
                line = sys.stdin.readline().strip()
                if line:
                    command = json.loads(line)
                    geo_service.process_command(command)
            except json.JSONDecodeError:
                geo_service.send_message('error', 'Invalid JSON command')
            except Exception as e:
                geo_service.send_message('error', f'Error processing command: {str(e)}')

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
