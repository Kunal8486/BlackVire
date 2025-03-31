#!/usr/bin/env python3
from scapy.all import sniff, IP, TCP, UDP, ICMP, get_if_list
from scapy.arch import get_if_addr
import json
import time
import sys
import threading
import queue
import select

# Global variables
capture_active = False
interface = None
packet_queue = queue.Queue()

def process_packet(packet):
    """Process a captured packet and extract relevant information."""
    packet_data = {
        'timestamp': time.time(),
        'protocol': 'Unknown',
        'src_ip': None,
        'dst_ip': None,
        'src_port': None,
        'dst_port': None,
        'size': len(packet),
    }
    
    # Extract IP information
    if IP in packet:
        packet_data['src_ip'] = packet[IP].src
        packet_data['dst_ip'] = packet[IP].dst
        
        # Determine protocol
        if TCP in packet:
            packet_data['protocol'] = 'TCP'
            packet_data['src_port'] = packet[TCP].sport
            packet_data['dst_port'] = packet[TCP].dport
        elif UDP in packet:
            packet_data['protocol'] = 'UDP'
            packet_data['src_port'] = packet[UDP].sport
            packet_data['dst_port'] = packet[UDP].dport
        elif ICMP in packet:
            packet_data['protocol'] = 'ICMP'
    
    return packet_data

def packet_capture_thread(iface=None):
    """Thread function for packet capturing."""
    global capture_active
    
    def packet_callback(packet):
        if not capture_active:
            return
        
        packet_info = process_packet(packet)
        packet_queue.put(packet_info)
    
    # Start packet capture
    capture_args = {}
    if iface:
        capture_args['iface'] = iface
    
    # Use stop_filter to allow stopping the capture
    sniff(prn=packet_callback, store=False, stop_filter=lambda p: not capture_active, **capture_args)

def start_capture(selected_interface=None):
    """Start packet capture on the specified interface."""
    global capture_active, interface, capture_thread
    
    if capture_active:
        send_message('warning', 'Capture already active')
        return
    
    interface = selected_interface
    capture_active = True
    
    # Start capture in a separate thread
    capture_thread = threading.Thread(target=packet_capture_thread, args=(interface,))
    capture_thread.daemon = True
    capture_thread.start()
    
    send_message('capture_status', {'active': True, 'interface': interface or 'default'})

def stop_capture():
    """Stop the active packet capture."""
    global capture_active
    
    if not capture_active:
        send_message('warning', 'No active capture to stop')
        return
    
    capture_active = False
    send_message('capture_status', {'active': False})

def get_interfaces():
    """Get list of available network interfaces."""
    interfaces = []
    
    try:
        interfaces = get_if_list()
        # Add IP addresses to interfaces
        interface_info = []
        for iface in interfaces:
            try:
                ip = get_if_addr(iface)
                interface_info.append({
                    'name': iface,
                    'ip': ip
                })
            except:
                interface_info.append({
                    'name': iface,
                    'ip': 'Unknown'
                })
        
        send_message('interfaces', {'interfaces': interface_info})
    except Exception as e:
        send_message('error', f'Failed to get interfaces: {str(e)}')
        return []

def send_message(msg_type, data):
    """Send message to the Node.js server."""
    if isinstance(data, dict):
        message = {'type': msg_type, **data}
    else:
        message = {'type': msg_type, 'message': data}
    
    print(json.dumps(message))
    sys.stdout.flush()

def main():
    """Main function to process commands from Node.js server and send packet data."""
    global packet_queue
    
    # Send startup message
    send_message('startup', {'status': 'ready'})
    
    # Start packet processing thread
    packet_processing_thread = threading.Thread(target=process_packet_queue)
    packet_processing_thread.daemon = True
    packet_processing_thread.start()
    
    # Process stdin commands from Node.js
    while True:
        # Check if there's input from stdin (non-blocking)
        if select.select([sys.stdin], [], [], 0.1)[0]:
            try:
                line = sys.stdin.readline().strip()
                if line:
                    command = json.loads(line)
                    process_command(command)
            except json.JSONDecodeError:
                send_message('error', 'Invalid JSON command')
            except Exception as e:
                send_message('error', f'Error processing command: {str(e)}')

def process_packet_queue():
    """Thread function to process and send packet data from the queue."""
    global packet_queue
    
    while True:
        try:
            # Get packet from queue with timeout
            packet_info = packet_queue.get(timeout=0.5)
            send_message('packet_data', packet_info)
            packet_queue.task_done()
        except queue.Empty:
            # No packets in the queue, continue
            pass
        except Exception as e:
            send_message('error', f'Error processing packet: {str(e)}')

def process_command(command):
    """Process command from Node.js server."""
    cmd = command.get('command')
    
    if cmd == 'start_capture':
        interface = command.get('interface')
        start_capture(interface)
    elif cmd == 'stop_capture':
        stop_capture()
    elif cmd == 'get_interfaces':
        get_interfaces()
    elif cmd == 'ping':
        send_message('pong', {'timestamp': time.time()})
    else:
        send_message('error', f'Unknown command: {cmd}')

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        # Handle clean shutdown
        if capture_active:
            stop_capture()
        sys.exit(0)