// Store processes globally
        let processes = [];
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#d35400', '#16a085', '#27ae60'];
        let animationTimers = []; // Store timers for clearing during reset
        
        // membuka tab
        function openTab(evt, tabName) {
            const tabcontent = document.getElementsByClassName("tab-content");
            for (let i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }
            
            const tablinks = document.getElementsByClassName("tab");
            for (let i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            
            document.getElementById(tabName).style.display = "block";
            evt.currentTarget.className += " active";
        }
        
        // menambahkan proses
        function addProcess() {
            const tableBody = document.getElementById("process-table-body");
            const rowCount = tableBody.rows.length;
            const newRow = tableBody.insertRow();
            
            const processId = `P${rowCount + 1}`;
            
            newRow.innerHTML = `
                <td>${processId}</td>
                <td><input type="number" min="0" value="0" id="arrival-${rowCount + 1}"></td>
                <td><input type="number" min="1" value="3" id="burst-${rowCount + 1}"></td>
                <td><input type="number" min="1" value="1" id="priority-${rowCount + 1}"></td>
                <td><button onclick="removeProcess(this)" class="remove-btn">Hapus</button></td>
            `;
        }
        
        // utk menghapus proses
        function removeProcess(btn) {
            const row = btn.parentNode.parentNode;
            if (document.getElementById("process-table-body").rows.length > 1) {
                row.parentNode.removeChild(row);
                renumberProcesses();
            } else {
                document.getElementById("error-message").textContent = "Minimal harus ada satu proses.";
                setTimeout(() => {
                    document.getElementById("error-message").textContent = "";
                }, 3000);
            }
        }
        
        // utk mengubah nomor ketika ada proses yg dihapus
        function renumberProcesses() {
            const tableBody = document.getElementById("process-table-body");
            const rows = tableBody.rows;
            
            for (let i = 0; i < rows.length; i++) {
                const processId = `P${i + 1}`;
                rows[i].cells[0].textContent = processId;
                
                // Update input IDs
                rows[i].cells[1].querySelector('input').id = `arrival-${i + 1}`;
                rows[i].cells[2].querySelector('input').id = `burst-${i + 1}`;
                rows[i].cells[3].querySelector('input').id = `priority-${i + 1}`;
            }
        }
        
        // mengambil proses dri table
        function getProcessesFromTable() {
            const tableBody = document.getElementById("process-table-body");
            const rows = tableBody.rows;
            const processList = [];
            
            for (let i = 0; i < rows.length; i++) {
                const processId = rows[i].cells[0].textContent;
                const arrivalTime = parseInt(rows[i].cells[1].querySelector('input').value);
                const burstTime = parseInt(rows[i].cells[2].querySelector('input').value);
                const priority = parseInt(rows[i].cells[3].querySelector('input').value);
                
                if (isNaN(arrivalTime) || isNaN(burstTime) || isNaN(priority) || burstTime <= 0 || priority <= 0) {
                    document.getElementById("error-message").textContent = "Semua nilai harus valid dan lebih besar dari 0.";
                    setTimeout(() => {
                        document.getElementById("error-message").textContent = "";
                    }, 3000);
                    return null;
                }
                
                processList.push({
                    id: processId,
                    arrival: arrivalTime,
                    burst: burstTime,
                    priority: priority,
                    color: colors[i % colors.length],
                    remaining: burstTime // utk rr
                });
            }
            
            return processList;
        }
        
        // Reset simulation
        function resetSimulation() {
            const ganttCharts = document.querySelectorAll('.gantt-chart');
            const metrics = document.querySelectorAll('.metrics');
            const animations = document.querySelectorAll('.animation-area');
            
            // Clear all animation timers
            animationTimers.forEach(timer => clearTimeout(timer));
            animationTimers = [];
            
            ganttCharts.forEach(chart => {
                chart.innerHTML = '<div class="empty-msg">Belum ada simulasi yang dijalankan.</div>';
            });
            
            metrics.forEach(metric => {
                metric.innerHTML = '';
            });
            
            animations.forEach(animation => {
                const cpu = animation.querySelector('.cpu');
                const queue = animation.querySelector('.queue');
                const completed = animation.querySelector('.completed');
                const timeDisplay = animation.querySelector('.current-time');
                
                // Reset timer display
                if (timeDisplay) timeDisplay.textContent = '0';
                
                // Keep only labels
                const queueLabel = queue.querySelector('.queue-label');
                const completedLabel = completed.querySelector('.completed-label');
                
                queue.innerHTML = '';
                completed.innerHTML = '';
                
                queue.appendChild(queueLabel);
                completed.appendChild(completedLabel);
                
                // Remove any process animations
                const processes = animation.querySelectorAll('.process');
                processes.forEach(process => {
                    process.remove();
                });
            });
            
            document.getElementById("error-message").textContent = "";
        }
        
        // FCFS Algorithm
        function fcfs(processes) {
            // Sort by waktu kedatangan 
            const sortedProcesses = [...processes].sort((a, b) => a.arrival - b.arrival);
            
            let currentTime = 0;
            const timeline = [];
            const completionTimes = {};
            
            for (const process of sortedProcesses) {
                // If there's a gap between processes
                if (process.arrival > currentTime) {
                    timeline.push({
                        id: "idle",
                        start: currentTime,
                        end: process.arrival
                    });
                    currentTime = process.arrival;
                }
                
                // Execute proses
                timeline.push({
                    id: process.id,
                    start: currentTime,
                    end: currentTime + process.burst,
                    color: process.color
                });
                
                currentTime += process.burst;
                completionTimes[process.id] = currentTime;
            }
            
            // Calculate metrics
            const metrics = calculateMetrics(sortedProcesses, completionTimes);
            
            return {
                timeline: timeline,
                metrics: metrics
            };
        }
        
        // SJF Algorithm (Non-preemptive)
        function sjf(processes) {
            const sortedProcesses = [...processes].sort((a, b) => a.arrival - b.arrival);
            
            let currentTime = 0;
            const timeline = [];
            const completionTimes = {};
            const remainingProcesses = [...sortedProcesses];
            
            while (remainingProcesses.length > 0) {
                // Find available processes at current time
                const availableProcesses = remainingProcesses.filter(p => p.arrival <= currentTime);
                
                if (availableProcesses.length === 0) {
                    // No process available, jump to next arrival
                    const nextArrival = Math.min(...remainingProcesses.map(p => p.arrival));
                    
                    timeline.push({
                        id: "idle",
                        start: currentTime,
                        end: nextArrival
                    });
                    
                    currentTime = nextArrival;
                    continue;
                }
                
                // Find shortest job among available processes
                const shortestJob = availableProcesses.reduce((min, p) => 
                    p.burst < min.burst ? p : min, availableProcesses[0]);
                
                // Execute shortest job
                timeline.push({
                    id: shortestJob.id,
                    start: currentTime,
                    end: currentTime + shortestJob.burst,
                    color: shortestJob.color
                });
                
                currentTime += shortestJob.burst;
                completionTimes[shortestJob.id] = currentTime;
                
                // Remove the processed job
                const index = remainingProcesses.findIndex(p => p.id === shortestJob.id);
                remainingProcesses.splice(index, 1);
            }
            
            // Calculate metrics
            const metrics = calculateMetrics(sortedProcesses, completionTimes);
            
            return {
                timeline: timeline,
                metrics: metrics
            };
        }
        


function sjfPreemptiveScheduling(processes) {
    
    const processesWithRemaining = processes.map(p => ({
        ...p,
        initialBurst: p.burst, 
        remaining: p.burst    
    }));
    
    let currentTime = 0;
    const timeline = [];
    const completionTimes = {};
    
    // Keep running until all processes are completed
    while (processesWithRemaining.some(p => p.remaining > 0)) {
        // Find available processes at current time
        const availableProcesses = processesWithRemaining.filter(p => p.arrival <= currentTime && p.remaining > 0);
        
        if (availableProcesses.length === 0) {
            // No process available, jump to next arrival
            const nextArrival = Math.min(...processesWithRemaining
                .filter(p => p.remaining > 0)
                .map(p => p.arrival));
            
            timeline.push({
                id: "idle",
                start: currentTime,
                end: nextArrival
            });
            
            currentTime = nextArrival;
            continue;
        }
        
        // utk mencari proses dngn burst time terendah
        const shortestJob = availableProcesses.reduce((min, p) =>
            p.remaining < min.remaining ? p : min, availableProcesses[0]);
        
    
        const nextArrivalTimes = processesWithRemaining
            .filter(p => p.arrival > currentTime && p.remaining > 0)
            .map(p => p.arrival);
        
        const executionEnd = currentTime + shortestJob.remaining;
        const nextEvent = nextArrivalTimes.length > 0 ? 
            Math.min(executionEnd, Math.min(...nextArrivalTimes)) : 
            executionEnd;
        
        // Execute the process until the next event
        const executeTime = nextEvent - currentTime;
        
        timeline.push({
            id: shortestJob.id,
            start: currentTime,
            end: nextEvent,
            color: shortestJob.color
        });
        
        shortestJob.remaining -= executeTime;
        currentTime = nextEvent;
        
        // If the process is completed, record its completion time
        if (shortestJob.remaining === 0) {
            completionTimes[shortestJob.id] = currentTime;
        }
    }
    
    // Calculate metrics
    const metrics = calculateMetricsForSJFP(processesWithRemaining, completionTimes);
    
    return {
        timeline: timeline,
        metrics: metrics
    };
}

// utk menghitung metrik SJF Preemptive
function calculateMetricsForSJFP(processes, completionTimes) {
    const metrics = {
        waitingTimes: {},
        turnaroundTimes: {},
        avgWaitingTime: 0,
        avgTurnaroundTime: 0
    };
    
    let totalWaitingTime = 0;
    let totalTurnaroundTime = 0;
    
    for (const process of processes) {
        const completionTime = completionTimes[process.id];
        const turnaroundTime = completionTime - process.arrival;
        const waitingTime = turnaroundTime - process.initialBurst; // Use initial burst time
        
        metrics.waitingTimes[process.id] = waitingTime;
        metrics.turnaroundTimes[process.id] = turnaroundTime;
        
        totalWaitingTime += waitingTime;
        totalTurnaroundTime += turnaroundTime;
    }
    
    metrics.avgWaitingTime = totalWaitingTime / processes.length;
    metrics.avgTurnaroundTime = totalTurnaroundTime / processes.length;
    
    return metrics;
}
        
        // Round Robin Algorithm
        function roundRobin(processes, quantum) {
            const sortedProcesses = [...processes].sort((a, b) => a.arrival - b.arrival);
            let processesQueue = [];
            
            let currentTime = 0;
            const timeline = [];
            const completionTimes = {};
            
            const remainingProcesses = sortedProcesses.map(p => ({
                ...p,
                remaining: p.burst
            }));
            
            while (remainingProcesses.some(p => p.remaining > 0)) {
                // Check for newly arrived processes
                const newArrivals = remainingProcesses
                    .filter(p => p.arrival <= currentTime && p.remaining > 0 && 
                            !processesQueue.some(qp => qp.id === p.id));
                
                // Add new arrivals to queue
                processesQueue = [...processesQueue, ...newArrivals];
                
                if (processesQueue.length === 0) {
                    // No process in queue, jump to next arrival
                    const nextArrival = Math.min(
                        ...remainingProcesses
                            .filter(p => p.remaining > 0)
                            .map(p => p.arrival)
                    );
                    
                    timeline.push({
                        id: "idle",
                        start: currentTime,
                        end: nextArrival
                    });
                    
                    currentTime = nextArrival;
                    continue;
                }
                
                // Get next process from queue
                const currentProcess = processesQueue.shift();
                const executeTime = Math.min(quantum, currentProcess.remaining);
                
                // Execute the process for quantum time or until completion
                timeline.push({
                    id: currentProcess.id,
                    start: currentTime,
                    end: currentTime + executeTime,
                    color: currentProcess.color
                });
                
                currentTime += executeTime;
                currentProcess.remaining -= executeTime;
                
                // jika proses belom selesai akan ditambahkan ke antrian lagi
                if (currentProcess.remaining > 0) {
                    processesQueue.push(currentProcess);
                } else {
                    completionTimes[currentProcess.id] = currentTime;
                }
                
                // Check for any process that arrived during this execution
                const arrivedDuringExecution = remainingProcesses
                    .filter(p => p.arrival > currentTime - executeTime && 
                           p.arrival <= currentTime && 
                           p.remaining > 0 && 
                           !processesQueue.some(qp => qp.id === p.id) &&
                           p.id !== currentProcess.id);
                
                processesQueue = [...processesQueue, ...arrivedDuringExecution];
            }
            
            // Calculate metrics
            const metrics = calculateMetrics(sortedProcesses, completionTimes);
            
            return {
                timeline: timeline,
                metrics: metrics
            };
        }
        
        // Calculate metrics for the algorithms
        function calculateMetrics(processes, completionTimes) {
            const metrics = {
                waitingTimes: {},
                turnaroundTimes: {},
                avgWaitingTime: 0,
                avgTurnaroundTime: 0
            };
            
            let totalWaitingTime = 0;
            let totalTurnaroundTime = 0;
            
            for (const process of processes) {
                const completionTime = completionTimes[process.id];
                const turnaroundTime = completionTime - process.arrival;
                const waitingTime = turnaroundTime - process.burst;
                
                metrics.waitingTimes[process.id] = waitingTime;
                metrics.turnaroundTimes[process.id] = turnaroundTime;
                
                totalWaitingTime += waitingTime;
                totalTurnaroundTime += turnaroundTime;
            }
            
            metrics.avgWaitingTime = totalWaitingTime / processes.length;
            metrics.avgTurnaroundTime = totalTurnaroundTime / processes.length;
            
            return metrics;
        }
        
        // Create and display Gantt Chart
        function createGanttChart(timeline, containerId) {
            const container = document.getElementById(containerId);
            container.innerHTML = '';
            
            if (timeline.length === 0) {
                container.innerHTML = '<div class="empty-msg">Tidak ada proses yang dijadwalkan.</div>';
                return;
            }
            
            const ganttContainer = document.createElement('div');
            ganttContainer.className = 'gantt-container';
            
            let totalWidth = 0;
            
            timeline.forEach(item => {
                const duration = item.end - item.start;
                const width = Math.max(duration * 40, 40); // Minimum width of 40px
                
                const block = document.createElement('div');
                block.className = 'gantt-block';
                block.style.width = width + 'px';
                
                if (item.id === "idle") {
                    block.style.backgroundColor = "#cccccc";
                    block.innerHTML = "Idle";
                } else {
                    block.style.backgroundColor = item.color;
                    block.innerHTML = item.id;
                }
                
                // Add time markers
                const startMarker = document.createElement('div');
                startMarker.className = 'gantt-time';
                startMarker.style.left = '0px';
                startMarker.textContent = item.start;
                block.appendChild(startMarker);
                
                const endMarker = document.createElement('div');
                endMarker.className = 'gantt-time';
                endMarker.style.right = '0px';
                endMarker.textContent = item.end;
                block.appendChild(endMarker);
                
                ganttContainer.appendChild(block);
                totalWidth += width;
            });
            
            container.appendChild(ganttContainer);
            
            // Set width to ensure proper scrolling
            ganttContainer.style.width = totalWidth + 'px';
        }
        
        // Display metrics
        function displayMetrics(metrics, processes, containerId) {
            const container = document.getElementById(containerId);
            container.innerHTML = '';
            
            const table = document.createElement('table');
            table.className = 'stats-table';
            
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <th>Proses</th>
                <th>Arrival Time</th>
                <th>Burst Time</th>
                <th>Completion Time</th>
                <th>Turnaround Time</th>
                <th>Waiting Time</th>
            `;
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            
            processes.forEach(process => {
                const row = document.createElement('tr');
                const completionTime = metrics.turnaroundTimes[process.id] + process.arrival;
                
                row.innerHTML = `
                    <td>${process.id}</td>
                    <td>${process.arrival}</td>
                    <td>${process.burst}</td>
                    <td>${completionTime}</td>
                    <td>${metrics.turnaroundTimes[process.id]}</td>
                    <td>${metrics.waitingTimes[process.id]}</td>
                `;
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            container.appendChild(table);
            
            const averages = document.createElement('div');
            averages.innerHTML = `
                <p><strong>Rata-rata Waktu Tunggu:</strong> ${metrics.avgWaitingTime.toFixed(2)}</p>
                <p><strong>Rata-rata Waktu Turnaround:</strong> ${metrics.avgTurnaroundTime.toFixed(2)}</p>
            `;
            container.appendChild(averages);
        }
        
        // membuat dn menjalankan animasi
        function animateAlgorithm(timeline, processes, containerId) {
            const animationArea = document.getElementById(containerId);
            const queueArea = animationArea.querySelector('.queue');
            const cpuArea = animationArea.querySelector('.cpu');
            const completedArea = animationArea.querySelector('.completed');
            const timeDisplay = animationArea.querySelector('.current-time');
            
            // Reset animation areas
            queueArea.innerHTML = '<div class="queue-label">Antrian Proses (Waiting)</div>';
            completedArea.innerHTML = '<div class="completed-label">Proses Selesai (Completed)</div>';
            
            // Create process elements for animation
            const processElements = {};
            processes.forEach(process => {
                const element = document.createElement('div');
                element.className = 'process process-animation';
                element.id = `${containerId}-${process.id}`;
                element.style.backgroundColor = process.color;
                element.textContent = process.id;
                element.style.opacity = 0;
                
                // Add status label
                const statusLabel = document.createElement('div');
                statusLabel.className = 'process-status';
                statusLabel.textContent = 'Waiting';
                element.appendChild(statusLabel);
                
                animationArea.appendChild(element);
                processElements[process.id] = element;
            });
            
            // Animation timeline
            let currentTime = 0;
            
            // Get all process arrivals
            const allArrivals = processes.map(p => p.arrival);
            const allCompletions = [];
            timeline.forEach(item => {
                if (item.id !== 'idle') {
                    allCompletions.push(item.end);
                }
            });
            
            // Get the maximum time
            const maxTime = Math.max(...allCompletions);
            
            // Create animation frames for each time unit
            for (let time = 0; time <= maxTime; time++) {
                animationTimers.push(setTimeout(() => {
                    // Update time display
                    timeDisplay.textContent = time;
                    
                    // Check for arriving processes
                    processes.forEach(process => {
                        if (process.arrival === time) {
                            const element = processElements[process.id];
                            element.style.opacity = 1;
                            element.style.left = '50px';
                            element.style.top = '40px';
                            
                            // Create queue entry
                            const queueEntry = document.createElement('div');
                            queueEntry.className = 'queue-process';
                            queueEntry.id = `queue-${process.id}`;
                            queueEntry.style.backgroundColor = process.color;
                            queueEntry.textContent = process.id;
                            queueArea.appendChild(queueEntry);
                        }
                    });
                    
                    // Check current running process
                    const currentBlock = timeline.find(item => item.start <= time && item.end > time);
                    
                    if (currentBlock && currentBlock.id !== 'idle') {
                        const runningElement = processElements[currentBlock.id];
                        
                        // Move to CPU if just started
                        if (currentBlock.start === time) {
                            runningElement.style.left = '50%';
                            runningElement.style.top = '90px';
                            runningElement.style.transform = 'translateX(-50%)';
                            
                            // Update status
                            const statusLabel = runningElement.querySelector('.process-status');
                            statusLabel.textContent = 'Running';
                            statusLabel.style.backgroundColor = 'rgba(46, 204, 113, 0.7)';
                            
                            // Remove from queue
                            const queueEntry = document.getElementById(`queue-${currentBlock.id}`);
                            if (queueEntry) {
                                queueEntry.remove();
                            }
                        }
                    }
                    
                    // Check for completed processes
                    timeline.forEach(item => {
                        if (item.id !== 'idle' && item.end === time) {
                            const completedElement = processElements[item.id];
                            completedElement.style.left = 'calc(100% - 100px)';
                            completedElement.style.top = '40px';
                            completedElement.style.transform = 'translateX(0)';
                            
                            // Update status
                            const statusLabel = completedElement.querySelector('.process-status');
                            statusLabel.textContent = 'Completed';
                            statusLabel.style.backgroundColor = 'rgba(52, 152, 219, 0.7)';
                            
                            // Create completed entry
                            const completedEntry = document.createElement('div');
                            completedEntry.className = 'completed-process';
                            completedEntry.style.backgroundColor = item.color;
                            completedEntry.textContent = item.id;
                            completedArea.appendChild(completedEntry);
                        }
                    });
                    
                }, time * 1000));
            }
        }

let simulationResults = {
    fcfs: null,
    sjf: null,
    sjfp: null,
    rr: null
};
function simulateAll() {
    resetSimulation();
    
    processes = getProcessesFromTable();
    if (!processes) return;
    
    const quantum = parseInt(document.getElementById("quantum-input").value);
    if (isNaN(quantum) || quantum <= 0) {
        document.getElementById("error-message").textContent = "Time quantum harus valid dan lebih besar dari 0.";
        setTimeout(() => {
            document.getElementById("error-message").textContent = "";
        }, 3000);
        return;
    }
    
    // Run FCFS
    const fcfsResult = fcfs(processes);
    createGanttChart(fcfsResult.timeline, "fcfs-gantt");
    displayMetrics(fcfsResult.metrics, processes, "fcfs-metrics");
    simulationResults.fcfs = { timeline: fcfsResult.timeline, processes: [...processes] };
    
    // Run SJF (Non-preemptive)
    const sjfResult = sjf(processes);
    createGanttChart(sjfResult.timeline, "sjf-gantt");
    displayMetrics(sjfResult.metrics, processes, "sjf-metrics");
    simulationResults.sjf = { timeline: sjfResult.timeline, processes: [...processes] };
    
    // Run SJF Preemptive
    const sjfpResult = sjfPreemptiveScheduling(processes);
    createGanttChart(sjfpResult.timeline, "sjfp-gantt");
    displayMetrics(sjfpResult.metrics, processes, "sjfp-metrics");
    simulationResults.sjfp = { timeline: sjfpResult.timeline, processes: [...processes] };
    
    // Run Round Robin
    const rrResult = roundRobin(processes, quantum);
    createGanttChart(rrResult.timeline, "rr-gantt");
    displayMetrics(rrResult.metrics, processes, "rr-metrics");
    simulationResults.rr = { timeline: rrResult.timeline, processes: [...processes] };
    
    // Show message to run animations
    document.getElementById("error-message").textContent = "Simulasi berhasil! Klik tombol 'Jalankan Animasi' untuk melihat animasi.";
    setTimeout(() => {
        document.getElementById("error-message").textContent = "";
    }, 5000);
}

// Function to run a single animation
function runSingleAnimation(algorithm) {
    // Clear any existing animations first
    clearAnimations();
    
    // Check if simulation has been run
    if (!simulationResults[algorithm]) {
        document.getElementById("error-message").textContent = "Jalankan simulasi terlebih dahulu dengan klik 'Simulasikan Semua'.";
        setTimeout(() => {
            document.getElementById("error-message").textContent = "";
        }, 3000);
        return;
    }
    
    // Get the animation area ID based on algorithm
    const animationAreaMap = {
        'fcfs': 'fcfs-animation',
        'sjf': 'sjf-animation',
        'sjfp': 'sjfp-animation',
        'rr': 'rr-animation'
    };
    
    // Run the specific animation
    animateAlgorithm(
        simulationResults[algorithm].timeline,
        simulationResults[algorithm].processes,
        animationAreaMap[algorithm]
    );
    
    // Show message
    document.getElementById("error-message").textContent = `Menjalankan animasi ${algorithm.toUpperCase()}...`;
    setTimeout(() => {
        document.getElementById("error-message").textContent = "";
    }, 2000);
}

// Helper function to clear all animations
function clearAnimations() {
    // Clear all animation timers
    animationTimers.forEach(timer => clearTimeout(timer));
    animationTimers = [];
    
    // Reset all animation areas
    const animationAreas = ['fcfs-animation', 'sjf-animation', 'sjfp-animation', 'rr-animation'];
    
    animationAreas.forEach(areaId => {
        const animationArea = document.getElementById(areaId);
        if (!animationArea) return;
        
        const queueArea = animationArea.querySelector('.queue');
        const completedArea = animationArea.querySelector('.completed');
        const timeDisplay = animationArea.querySelector('.current-time');
        
        // Reset timer display
        if (timeDisplay) timeDisplay.textContent = '0';
        
        // Keep only labels
        if (queueArea) {
            const queueLabel = queueArea.querySelector('.queue-label');
            queueArea.innerHTML = '';
            if (queueLabel) queueArea.appendChild(queueLabel);
        }
        
        if (completedArea) {
            const completedLabel = completedArea.querySelector('.completed-label');
            completedArea.innerHTML = '';
            if (completedLabel) completedArea.appendChild(completedLabel);
        }
        
        // Remove any process animations
        const processes = animationArea.querySelectorAll('.process');
        processes.forEach(process => {
            process.remove();
        });
    });
}

// Add to the reset function to clear stored simulation results
function resetSimulation() {
    // Existing reset code...
    
    // Reset stored simulation results
    simulationResults = {
        fcfs: null,
        sjf: null,
        sjfp: null,
        rr: null
    };
}