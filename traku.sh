#!/bin/bash



echo "[+] Starting network discovery..."

# Common ports to check
PORTS="22 23 53 80 135 139 443 445 993 995 1723 3389 5985 5986 8080 8443"

# Function to test connectivity
test_port() {
    local ip=$1
    local port=$2
    timeout 1 bash -c "</dev/tcp/$ip/$port" 2>/dev/null && echo "$ip:$port"
}

# Scan specific IPs from routing table first (quick wins)
echo "[+] Checking gateway and specific routes..."
for ip in "169.240.1.1" "169.192.255.119"; do
    for port in $PORTS; do
        test_port "$ip" "$port" &
    done
done
wait

# Scan 169.240.1.0/24 subnet (most likely to have services)
echo "[+] Scanning 169.240.1.0/24..."
for i in {1..254}; do
    ip="169.240.1.$i"
    for port in $PORTS; do
        test_port "$ip" "$port" &
        # Limit concurrent jobs to avoid overwhelming
        (( $(jobs -r | wc -l) >= 50 )) && wait
    done
done
wait

# If you want to scan the entire /16 (WARNING: This will take a VERY long time)
# Uncomment the section below only if you're sure
: 
echo "[+] Scanning entire 169.240.0.0/16 (this will take hours)..."
for subnet in {0..255}; do
    echo "[+] Scanning 169.240.$subnet.0/24..."
    for host in {1..254}; do
        ip="169.240.$subnet.$host"
        for port in 22 80 443 8080; do  # Reduced port list for speed
            test_port "$ip" "$port" &
            (( $(jobs -r | wc -l) >= 100 )) && wait
        done
    done
    wait
done


echo "[+] Network discovery complete"
