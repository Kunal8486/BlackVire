#!/usr/bin/env python3
from scapy.all import rdpcap, IP, TCP, UDP
import json
import sys
import time
import os
import select
from collections import defaultdict, Counter

class TrafficAnalyzer:
    def __init__(self):
        self.results = {}
        self.packet_count = 0
        self.analysis_running = False
    
    def analyze_pcap(self, pcap_file):
        """Analyze a PCAP file and extract statistics."""
        if not os.path.exists(pcap_file):
            self.send_message('error', f"File not found: {pcap_file}")
            return
        
        self.analysis_running = True
        self.send_message('analysis_status', {'status': 'started', 'file': pcap_file})
        
        try:
            # Initialize counters
            ip_counter = Counter()
            protocol_counter = Counter()
            port_counter = Counter()
            conn_pairs = defaultdict(int)
            packet_sizes = []
            
            # Read packets
            packets = rdpcap(pcap_file)
            self.packet_count = len(packets)
            
            # Process packets in batches with progress updates
            batch_size = max(100, self.packet_count // 100)  # Update progress ~100 times
            
            for i, packet in enumerate(packets):
                if not self.analysis_running:
                    self.send_message('analysis_status', {'status': 'cancelled'})
                    return
                
                # Send progress updates
                if i % batch_size == 0 or i == self.packet_count - 1:
                    progress = min(100, int((i + 1) / self.packet_count * 100))
                    self.send_message('analysis_progress', {'progress': progress})
                
                # Extract IP information
                if IP in packet:
                    src_ip = packet[IP].src
                    dst_ip = packet[IP].dst
                    
                    # Count IPs
                    ip_counter[src_ip] += 1
                    ip_counter[dst_ip] += 1
                    
                    # Count connection pairs
                    conn_pair = f"{src_ip} → {dst_ip}"
                    conn_pairs[conn_pair] += 1
                    
                    # Count packet sizes
                    packet_sizes.append(len(packet))
                    
                    # Determine protocol
                    if TCP in packet:
                        protocol_counter['TCP'] += 1
                        port_counter[f"TCP {packet[TCP].sport}"] += 1
                        port_counter[f"TCP {packet[TCP].dport}"] += 1
                    elif UDP in packet:
                        protocol_counter['UDP'] += 1
                        port_counter[f"UDP {packet[UDP].sport}"] += 1
                        port_counter[f"UDP {packet[UDP].dport}"] += 1
                    else:
                        protocol_counter['Other'] += 1
            
            # Calculate statistics
            avg_size = sum(packet_sizes) / len(packet_sizes) if packet_sizes else 0
            
            # Prepare results
            self.results = {
                'packet_count': self.packet_count,
                'top_ips': dict(ip_counter.most_common(10)),
                'protocols': dict(protocol_counter),
                'top_ports': dict(port_counter.most_common(10)),
                'top_connections': dict(sorted(conn_pairs.items(), key=lambda x: x[1], reverse=True)[:10]),
                'packet_sizes': {
                    'min': min(packet_sizes) if packet_sizes else 0,
                    'max': max(packet_sizes) if packet_sizes else 0,
                    'avg': avg_size
                }
            }
            
            # Send final results
            self.send_message('analysis_results', self.results)
            self.send_message('analysis_status', {'status': 'completed'})
            
        except Exception as e:
            self.send_message('error', f"Analysis failed: {str(e)}")
            self.send_message('analysis_status', {'status': 'error'})
        finally:
            self.analysis_running = False
    
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
        
        if cmd == 'analyze_pcap':
            pcap_file = command.get('file')
            if pcap_file:
                self.analyze_pcap(pcap_file)
            else:
                self.send_message('error', 'Missing PCAP file path')
        
        elif cmd == 'cancel_analysis':
            self.analysis_running = False
            self.send_message('analysis_status', {'status': 'cancelling'})
        
        elif cmd == 'get_results':
            if self.results:
                self.send_message('analysis_results', self.results)
            else:
                self.send_message('warning', 'No analysis results available')
        
        elif cmd == 'ping':
            self.send_message('pong', {'timestamp': time.time()})
        
        else:
            self.send_message('error', f'Unknown command: {cmd}')

def main():
    # Initialize analyzer
    analyzer = TrafficAnalyzer()
    
    # Send startup message
    analyzer.send_message('startup', {'status': 'ready'})
    
    # Process stdin commands from Node.js
    while True:
        # Check if there's input from stdin (non-blocking)
        if select.select([sys.stdin], [], [], 0.1)[0]:
            try:
                line = sys.stdin.readline().strip()
                if line:
                    command = json.loads(line)
                    analyzer.process_command(command)
            except json.JSONDecodeError:
                analyzer.send_message('error', 'Invalid JSON command')
            except Exception as e:
                analyzer.send_message('error', f'Error processing command: {str(e)}')

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)