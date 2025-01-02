// Initialize chart
let salaryChart = null;
let isMonthlyView = true;
let currentPeriod = 'monthly';

// Constants for salary breakdown
const BASIC_SALARY_PERCENT = 0.5;  // 50% of CTC
const HRA_PERCENT = 0.4;           // 40% of Basic
const PF_PERCENT = 0.12;           // 12% of Basic
const PROF_TAX = 2500;             // Professional Tax (annual)

// New Tax Regime Slabs (FY 2023-24)
const TAX_SLABS = [
    { limit: 300000, rate: 0 },    // 0-3L: 0%
    { limit: 600000, rate: 0.05 }, // 3-6L: 5%
    { limit: 900000, rate: 0.10 }, // 6-9L: 10%
    { limit: 1200000, rate: 0.15 },// 9-12L: 15%
    { limit: 1500000, rate: 0.20 },// 12-15L: 20%
    { limit: Infinity, rate: 0.30 } // >15L: 30%
];

// Health and Education Cess
const CESS_RATE = 0.04;

// Calculate Income Tax
function calculateIncomeTax(taxableIncome) {
    let tax = 0;
    let remainingIncome = taxableIncome;
    let previousLimit = 0;

    for (const slab of TAX_SLABS) {
        if (remainingIncome <= 0) break;
        
        const slabAmount = slab.limit - previousLimit;
        const taxableInSlab = Math.min(remainingIncome, slabAmount);
        
        tax += taxableInSlab * slab.rate;
        remainingIncome -= taxableInSlab;
        previousLimit = slab.limit;
    }

    // Add Health and Education Cess
    const cessAmount = tax * CESS_RATE;
    return tax + cessAmount;
}

// Calculate Standard Deduction
const STANDARD_DEDUCTION = 50000; // ₹50,000 standard deduction

// Custom cursor
function updateCursor(e) {
    const cursor = document.querySelector('.cursor');
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
}

function initializeCursor() {
    document.addEventListener('mousemove', updateCursor);
    
    // Scale effect on interactive elements
    const interactiveElements = document.querySelectorAll('button, input, .breakdown-item');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            document.querySelector('.cursor').style.transform = 'translate(-50%, -50%) scale(1.5)';
        });
        el.addEventListener('mouseleave', () => {
            document.querySelector('.cursor').style.transform = 'translate(-50%, -50%) scale(1)';
        });
    });
}

// Theme toggling
function initializeTheme() {
    const themeBtn = document.querySelector('.theme-btn');
    const icon = themeBtn.querySelector('i');
    
    themeBtn.addEventListener('click', () => {
        document.body.dataset.theme = document.body.dataset.theme === 'dark' ? '' : 'dark';
        icon.className = document.body.dataset.theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
        updateChart(); // Update chart colors based on theme
    });
}

// Number formatting
function formatCurrency(amount, forceAnnual = false) {
    const value = isMonthlyView && !forceAnnual ? amount / 12 : amount;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
    }).format(value);
}

// Format number to Indian currency style (e.g., 1,00,000)
function formatIndianCurrency(number) {
    const roundedNum = Math.round(number);
    const numStr = roundedNum.toString();
    let formattedNum = '';
    
    // Handle numbers less than 1000
    if (numStr.length <= 3) {
        return numStr;
    }
    
    // Add last 3 digits
    formattedNum = numStr.slice(-3);
    
    // Add remaining digits in groups of 2
    let remaining = numStr.slice(0, -3);
    while (remaining.length > 0) {
        formattedNum = remaining.slice(-2) + ',' + formattedNum;
        remaining = remaining.slice(0, -2);
    }
    
    // Remove leading comma if present
    if (formattedNum[0] === ',') {
        formattedNum = formattedNum.slice(1);
    }
    
    return formattedNum;
}

// Update all amount displays
function updateAmountDisplays(amounts) {
    for (const [id, value] of Object.entries(amounts)) {
        const element = document.getElementById(id);
        if (element) {
            // Convert value based on selected period
            const displayValue = currentPeriod === 'monthly' ? value / 12 : value;
            element.textContent = `₹${formatIndianCurrency(displayValue)}`;
        }
    }
    
    // Update period label
    const periodLabel = document.querySelector('.period-label');
    if (periodLabel) {
        periodLabel.textContent = currentPeriod === 'monthly' ? 'Monthly' : 'Annual';
    }
}

// Period toggle functionality
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.toggle-btn.active').classList.remove('active');
        btn.classList.add('active');
        currentPeriod = btn.getAttribute('data-period');
        calculateSalary(); // Recalculate with new period
    });
});

// Chart initialization
function initializeChart() {
    const ctx = document.getElementById('salary-chart').getContext('2d');
    const isDarkTheme = document.body.dataset.theme === 'dark';
    
    salaryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Basic', 'HRA', 'Other Allowances', 'Deductions'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(131, 140, 248, 0.8)',
                    'rgba(79, 70, 229, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: isDarkTheme ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDarkTheme ? '#f1f5f9' : '#1f2937',
                        font: {
                            family: 'Space Grotesk',
                            size: 14
                        },
                        padding: 20
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

// Update chart data
function updateChart(basic, hra, other, deductions) {
    if (!salaryChart) return;
    
    const isDarkTheme = document.body.dataset.theme === 'dark';
    salaryChart.data.datasets[0].borderColor = isDarkTheme ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)';
    salaryChart.options.plugins.legend.labels.color = isDarkTheme ? '#f1f5f9' : '#1f2937';
    
    salaryChart.data.datasets[0].data = [basic, hra, other, deductions];
    salaryChart.update();
}

// Animate number change
function animateValue(element, start, end, duration, forceAnnual = false) {
    const range = end - start;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = start + (range * easeOutQuart);
        
        element.textContent = formatCurrency(Math.round(current), forceAnnual);
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Update display based on period
function updateDisplay(values) {
    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        const currentValue = parseFloat(element.textContent.replace(/[^0-9.-]+/g, '')) || 0;
        const currentActual = isMonthlyView ? currentValue * 12 : currentValue;
        animateValue(element, currentActual, value, 800);
    });

    // Update period label
    document.querySelector('.period-label').textContent = isMonthlyView ? 'Monthly' : 'Annual';
}

// Initial state values
const initialState = {
    'basic-salary': 0,
    'hra': 0,
    'other-allowances': 0,
    'pf-deduction': 0,
    'professional-tax': 0,
    'income-tax': 0,
    'total-deductions': 0,
    'in-hand-salary': 0
};

// Initialize display with zeros
function initializeDisplay() {
    Object.entries(initialState).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = formatCurrency(value);
        }
    });
}

// Format input with Indian style commas
function formatInputWithCommas(input) {
    // Remove existing commas and non-digit characters
    let value = input.value.replace(/[^0-9]/g, '');
    
    // Store actual numeric value as a data attribute
    input.dataset.value = value;
    
    // Format with Indian style commas if there's a value
    if (value.length > 0) {
        value = parseInt(value).toString(); // Remove leading zeros
        input.value = formatIndianCurrency(value);
    } else {
        input.value = '';
    }
}

// Initialize input fields
document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', (e) => {
        const cursorPos = e.target.selectionStart;
        const oldLength = e.target.value.length;
        
        formatInputWithCommas(e.target);
        calculateSalary();
        
        // Adjust cursor position after formatting
        const newLength = e.target.value.length;
        const newPos = cursorPos + (newLength - oldLength);
        e.target.setSelectionRange(newPos, newPos);
    });
    
    input.addEventListener('keydown', (e) => {
        // Allow: backspace, delete, tab, escape, enter, dots, and numbers
        if ([46, 8, 9, 27, 13, 110].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            return;
        }
        // Stop if not a number
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && 
            (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });
    
    // Keep raw value when focused
    input.addEventListener('focus', (e) => {
        const value = e.target.dataset.value || '';
        e.target.value = value;
    });
    
    // Reformat when blurred
    input.addEventListener('blur', (e) => {
        formatInputWithCommas(e.target);
    });
});

// Calculate salary breakdown
function calculateSalary() {
    const ctcInput = document.getElementById('ctc');
    const bonusInput = document.getElementById('bonus');
    
    const ctc = parseInt(ctcInput.dataset.value || '0');
    const bonus = parseInt(bonusInput.dataset.value || '0');

    // If both inputs are empty, reset to initial state
    if (ctc === 0 && bonus === 0) {
        updateAmountDisplays(initialState);
        updateChart(0, 0, 0, 0);
        return;
    }

    // Input validation
    if (ctc < 0 || bonus < 0 || bonus > ctc) {
        return;
    }

    // Calculate components
    const basicSalary = ctc * BASIC_SALARY_PERCENT;
    const hra = basicSalary * HRA_PERCENT;
    const pfDeduction = Math.min(basicSalary * PF_PERCENT, 21600); // PF capped at 1800 per month
    const otherAllowances = ctc - basicSalary - hra;

    // Calculate taxable income
    const totalIncome = ctc + bonus;
    const taxableIncome = totalIncome - STANDARD_DEDUCTION - pfDeduction;
    
    // Calculate income tax
    const incomeTax = calculateIncomeTax(taxableIncome);
    
    // Calculate total deductions
    const totalDeductions = pfDeduction + PROF_TAX + incomeTax;

    // Calculate in-hand salary
    const inHandSalary = totalIncome - totalDeductions;

    // Update UI
    const values = {
        'basic-salary': basicSalary,
        'hra': hra,
        'other-allowances': otherAllowances,
        'pf-deduction': pfDeduction,
        'professional-tax': PROF_TAX,
        'income-tax': incomeTax,
        'total-deductions': totalDeductions,
        'in-hand-salary': inHandSalary
    };

    updateAmountDisplays(values);
    updateChart(basicSalary, hra, otherAllowances, totalDeductions);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    initializeDisplay();
    initializeCursor();
    initializeTheme();
    
    const inputs = ['ctc', 'bonus'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', () => {
            requestAnimationFrame(calculateSalary);
        });
        
        // Add focus effects
        input.addEventListener('focus', () => {
            input.parentElement.style.transform = 'scale(1.02)';
            input.parentElement.style.transition = 'transform 0.2s ease';
        });
        
        input.addEventListener('blur', () => {
            input.parentElement.style.transform = 'scale(1)';
        });
    });

    // Add period toggle handlers with smooth transitions
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Animate the transition
            const resultsContainer = document.querySelector('.results-container');
            resultsContainer.style.opacity = '0';
            resultsContainer.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                isMonthlyView = btn.dataset.period === 'monthly';
                calculateSalary();
                
                resultsContainer.style.opacity = '1';
                resultsContainer.style.transform = 'translateY(0)';
            }, 200);
        });
    });
});
