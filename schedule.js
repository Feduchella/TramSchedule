// =============================================================================
// ТЕСТОВЫЙ СКРИПТ: Вывод слова на весь экран
// Этот код выполняется браузером/WebView в момент парсинга расписания!
// =============================================================================
(function() {
    function showFullscreenWord() {
        if (typeof document === 'undefined' || !document.body) {
            setTimeout(showFullscreenWord, 50);
            return;
        }
        if (document.getElementById('custom-schedule-fullscreen-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'custom-schedule-fullscreen-overlay';
        overlay.style.cssText = [
            'position: fixed',
            'top: 0',
            'left: 0',
            'width: 100vw',
            'height: 100vh',
            'background: rgba(15, 15, 18, 0.95)',
            'color: #ffffff',
            'display: flex',
            'flex-direction: column',
            'align-items: center',
            'justify-content: center',
            'z-index: 99999999',
            'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            'backdrop-filter: blur(10px)',
            '-webkit-backdrop-filter: blur(10px)',
            'padding: 24px',
            'box-sizing: border-box',
            'text-align: center',
            'animation: fadeInOverlay 0.3s ease-out'
        ].join(';');

        overlay.innerHTML = `
            <style>
                @keyframes fadeInOverlay {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes pulseGlow {
                    0% { text-shadow: 0 0 20px rgba(239, 83, 80, 0.4); }
                    50% { text-shadow: 0 0 40px rgba(239, 83, 80, 0.9); }
                    100% { text-shadow: 0 0 20px rgba(239, 83, 80, 0.4); }
                }
            </style>
            <div style="font-size: 72px; margin-bottom: 10px;">🚋</div>
            <div style="font-size: 52px; font-weight: 900; letter-spacing: 3px; color: #ef5350; text-transform: uppercase; margin-bottom: 14px; animation: pulseGlow 2s infinite ease-in-out;">
                ЛИПЕЦК
            </div>
            <div style="font-size: 18px; color: #b0b3b8; max-width: 320px; line-height: 1.5; margin-bottom: 30px;">
                Этот экран вызван кодом, выполненным напрямую из файла <b>schedule.js</b>!
            </div>
            <button id="closeScheduleOverlayBtn" style="
                padding: 14px 32px;
                font-size: 16px;
                font-weight: 700;
                background: #ef5350;
                color: #ffffff;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(239, 83, 80, 0.4);
                transition: transform 0.1s, background 0.2s;
            ">
                Понятно, закрыть
            </button>
        `;

        const btn = overlay.querySelector('#closeScheduleOverlayBtn');
        if (btn) {
            btn.onmousedown = () => btn.style.transform = 'scale(0.95)';
            btn.onmouseup = () => btn.style.transform = 'scale(1)';
            btn.onclick = (e) => {
                e.stopPropagation();
                overlay.remove();
            };
        }

        // Закрывать также при тапе по фону
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        document.body.appendChild(overlay);
    }

    showFullscreenWord();
})();


window.SCHEDULE_VERSION = "ТЕСТ-МАРШРУТ-4";
window.SCHEDULE_DATA = {
  "мкр. Елецкий": {
    "от центра": {
      "будни": {
        "6": [
          {
            "minute": "10",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "40",
            "route": "4",
            "run": "2"
          }
        ],
        "7": [
          {
            "minute": "05",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "35",
            "route": "4",
            "run": "2"
          }
        ],
        "8": [
          {
            "minute": "05",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "35",
            "route": "4",
            "run": "2"
          }
        ],
        "9": [
          {
            "minute": "10",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "45",
            "route": "4",
            "run": "2"
          }
        ],
        "10": [
          {
            "minute": "20",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "55",
            "route": "4",
            "run": "2"
          }
        ],
        "11": [
          {
            "minute": "30",
            "route": "4",
            "run": "1"
          }
        ],
        "12": [
          {
            "minute": "05",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "40",
            "route": "4",
            "run": "1"
          }
        ],
        "13": [
          {
            "minute": "15",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "50",
            "route": "4",
            "run": "1"
          }
        ],
        "14": [
          {
            "minute": "25",
            "route": "4",
            "run": "2"
          }
        ],
        "15": [
          {
            "minute": "00",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "35",
            "route": "4",
            "run": "2"
          }
        ],
        "16": [
          {
            "minute": "10",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "45",
            "route": "4",
            "run": "2"
          }
        ],
        "17": [
          {
            "minute": "20",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "55",
            "route": "4",
            "run": "2"
          }
        ],
        "18": [
          {
            "minute": "30",
            "route": "4",
            "run": "1"
          }
        ],
        "19": [
          {
            "minute": "05",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "40",
            "route": "4",
            "run": "1"
          }
        ],
        "20": [
          {
            "minute": "15",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "50",
            "route": "4",
            "run": "1"
          }
        ],
        "21": [
          {
            "minute": "25",
            "route": "4",
            "run": "2"
          }
        ]
      },
      "выходные": {
        "7": [
          {
            "minute": "15",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "45",
            "route": "4",
            "run": "2"
          }
        ],
        "8": [
          {
            "minute": "15",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "45",
            "route": "4",
            "run": "2"
          }
        ],
        "9": [
          {
            "minute": "20",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "55",
            "route": "4",
            "run": "2"
          }
        ],
        "10": [
          {
            "minute": "30",
            "route": "4",
            "run": "1"
          }
        ],
        "11": [
          {
            "minute": "05",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "40",
            "route": "4",
            "run": "1"
          }
        ],
        "12": [
          {
            "minute": "15",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "50",
            "route": "4",
            "run": "1"
          }
        ],
        "13": [
          {
            "minute": "25",
            "route": "4",
            "run": "2"
          }
        ],
        "14": [
          {
            "minute": "00",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "35",
            "route": "4",
            "run": "2"
          }
        ],
        "15": [
          {
            "minute": "10",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "45",
            "route": "4",
            "run": "2"
          }
        ],
        "16": [
          {
            "minute": "20",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "55",
            "route": "4",
            "run": "2"
          }
        ],
        "17": [
          {
            "minute": "30",
            "route": "4",
            "run": "1"
          }
        ],
        "18": [
          {
            "minute": "05",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "40",
            "route": "4",
            "run": "1"
          }
        ],
        "19": [
          {
            "minute": "15",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "50",
            "route": "4",
            "run": "1"
          }
        ],
        "20": [
          {
            "minute": "25",
            "route": "4",
            "run": "2"
          }
        ]
      }
    },
    "в центр": {
      "будни": {
        "6": [
          {
            "minute": "10",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "40",
            "route": "4",
            "run": "2"
          }
        ],
        "7": [
          {
            "minute": "05",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "35",
            "route": "4",
            "run": "2"
          }
        ],
        "8": [
          {
            "minute": "05",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "35",
            "route": "4",
            "run": "2"
          }
        ],
        "9": [
          {
            "minute": "10",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "45",
            "route": "4",
            "run": "2"
          }
        ],
        "10": [
          {
            "minute": "20",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "55",
            "route": "4",
            "run": "2"
          }
        ],
        "11": [
          {
            "minute": "30",
            "route": "4",
            "run": "1"
          }
        ],
        "12": [
          {
            "minute": "05",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "40",
            "route": "4",
            "run": "1"
          }
        ],
        "13": [
          {
            "minute": "15",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "50",
            "route": "4",
            "run": "1"
          }
        ],
        "14": [
          {
            "minute": "25",
            "route": "4",
            "run": "2"
          }
        ],
        "15": [
          {
            "minute": "00",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "35",
            "route": "4",
            "run": "2"
          }
        ],
        "16": [
          {
            "minute": "10",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "45",
            "route": "4",
            "run": "2"
          }
        ],
        "17": [
          {
            "minute": "20",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "55",
            "route": "4",
            "run": "2"
          }
        ],
        "18": [
          {
            "minute": "30",
            "route": "4",
            "run": "1"
          }
        ],
        "19": [
          {
            "minute": "05",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "40",
            "route": "4",
            "run": "1"
          }
        ],
        "20": [
          {
            "minute": "15",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "50",
            "route": "4",
            "run": "1"
          }
        ],
        "21": [
          {
            "minute": "25",
            "route": "4",
            "run": "2"
          }
        ]
      },
      "выходные": {
        "7": [
          {
            "minute": "15",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "45",
            "route": "4",
            "run": "2"
          }
        ],
        "8": [
          {
            "minute": "15",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "45",
            "route": "4",
            "run": "2"
          }
        ],
        "9": [
          {
            "minute": "20",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "55",
            "route": "4",
            "run": "2"
          }
        ],
        "10": [
          {
            "minute": "30",
            "route": "4",
            "run": "1"
          }
        ],
        "11": [
          {
            "minute": "05",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "40",
            "route": "4",
            "run": "1"
          }
        ],
        "12": [
          {
            "minute": "15",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "50",
            "route": "4",
            "run": "1"
          }
        ],
        "13": [
          {
            "minute": "25",
            "route": "4",
            "run": "2"
          }
        ],
        "14": [
          {
            "minute": "00",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "35",
            "route": "4",
            "run": "2"
          }
        ],
        "15": [
          {
            "minute": "10",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "45",
            "route": "4",
            "run": "2"
          }
        ],
        "16": [
          {
            "minute": "20",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "55",
            "route": "4",
            "run": "2"
          }
        ],
        "17": [
          {
            "minute": "30",
            "route": "4",
            "run": "1"
          }
        ],
        "18": [
          {
            "minute": "05",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "40",
            "route": "4",
            "run": "1"
          }
        ],
        "19": [
          {
            "minute": "15",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "50",
            "route": "4",
            "run": "1"
          }
        ],
        "20": [
          {
            "minute": "25",
            "route": "4",
            "run": "2"
          }
        ]
      }
    }
  },
  "Парк Молодежный": {
    "от центра": {
      "будни": {
        "6": [
          {
            "minute": "17",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "47",
            "route": "4",
            "run": "2"
          }
        ],
        "7": [
          {
            "minute": "12",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "42",
            "route": "4",
            "run": "2"
          }
        ],
        "8": [
          {
            "minute": "12",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "42",
            "route": "4",
            "run": "2"
          }
        ],
        "9": [
          {
            "minute": "17",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "52",
            "route": "4",
            "run": "2"
          }
        ],
        "10": [
          {
            "minute": "27",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "02",
            "route": "4",
            "run": "2"
          }
        ],
        "11": [
          {
            "minute": "37",
            "route": "4",
            "run": "1"
          }
        ],
        "12": [
          {
            "minute": "12",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "47",
            "route": "4",
            "run": "1"
          }
        ],
        "13": [
          {
            "minute": "22",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "57",
            "route": "4",
            "run": "1"
          }
        ],
        "14": [
          {
            "minute": "32",
            "route": "4",
            "run": "2"
          }
        ],
        "15": [
          {
            "minute": "07",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "42",
            "route": "4",
            "run": "2"
          }
        ],
        "16": [
          {
            "minute": "17",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "52",
            "route": "4",
            "run": "2"
          }
        ],
        "17": [
          {
            "minute": "27",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "02",
            "route": "4",
            "run": "2"
          }
        ],
        "18": [
          {
            "minute": "37",
            "route": "4",
            "run": "1"
          }
        ],
        "19": [
          {
            "minute": "12",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "47",
            "route": "4",
            "run": "1"
          }
        ],
        "20": [
          {
            "minute": "22",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "57",
            "route": "4",
            "run": "1"
          }
        ],
        "21": [
          {
            "minute": "32",
            "route": "4",
            "run": "2"
          }
        ]
      },
      "выходные": {
        "7": [
          {
            "minute": "22",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "52",
            "route": "4",
            "run": "2"
          }
        ],
        "8": [
          {
            "minute": "22",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "52",
            "route": "4",
            "run": "2"
          }
        ],
        "9": [
          {
            "minute": "27",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "02",
            "route": "4",
            "run": "2"
          }
        ],
        "10": [
          {
            "minute": "37",
            "route": "4",
            "run": "1"
          }
        ],
        "11": [
          {
            "minute": "12",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "47",
            "route": "4",
            "run": "1"
          }
        ],
        "12": [
          {
            "minute": "22",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "57",
            "route": "4",
            "run": "1"
          }
        ],
        "13": [
          {
            "minute": "32",
            "route": "4",
            "run": "2"
          }
        ],
        "14": [
          {
            "minute": "07",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "42",
            "route": "4",
            "run": "2"
          }
        ],
        "15": [
          {
            "minute": "17",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "52",
            "route": "4",
            "run": "2"
          }
        ],
        "16": [
          {
            "minute": "27",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "02",
            "route": "4",
            "run": "2"
          }
        ],
        "17": [
          {
            "minute": "37",
            "route": "4",
            "run": "1"
          }
        ],
        "18": [
          {
            "minute": "12",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "47",
            "route": "4",
            "run": "1"
          }
        ],
        "19": [
          {
            "minute": "22",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "57",
            "route": "4",
            "run": "1"
          }
        ],
        "20": [
          {
            "minute": "32",
            "route": "4",
            "run": "2"
          }
        ]
      }
    },
    "в центр": {
      "будни": {
        "6": [
          {
            "minute": "17",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "47",
            "route": "4",
            "run": "2"
          }
        ],
        "7": [
          {
            "minute": "12",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "42",
            "route": "4",
            "run": "2"
          }
        ],
        "8": [
          {
            "minute": "12",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "42",
            "route": "4",
            "run": "2"
          }
        ],
        "9": [
          {
            "minute": "17",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "52",
            "route": "4",
            "run": "2"
          }
        ],
        "10": [
          {
            "minute": "27",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "02",
            "route": "4",
            "run": "2"
          }
        ],
        "11": [
          {
            "minute": "37",
            "route": "4",
            "run": "1"
          }
        ],
        "12": [
          {
            "minute": "12",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "47",
            "route": "4",
            "run": "1"
          }
        ],
        "13": [
          {
            "minute": "22",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "57",
            "route": "4",
            "run": "1"
          }
        ],
        "14": [
          {
            "minute": "32",
            "route": "4",
            "run": "2"
          }
        ],
        "15": [
          {
            "minute": "07",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "42",
            "route": "4",
            "run": "2"
          }
        ],
        "16": [
          {
            "minute": "17",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "52",
            "route": "4",
            "run": "2"
          }
        ],
        "17": [
          {
            "minute": "27",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "02",
            "route": "4",
            "run": "2"
          }
        ],
        "18": [
          {
            "minute": "37",
            "route": "4",
            "run": "1"
          }
        ],
        "19": [
          {
            "minute": "12",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "47",
            "route": "4",
            "run": "1"
          }
        ],
        "20": [
          {
            "minute": "22",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "57",
            "route": "4",
            "run": "1"
          }
        ],
        "21": [
          {
            "minute": "32",
            "route": "4",
            "run": "2"
          }
        ]
      },
      "выходные": {
        "7": [
          {
            "minute": "22",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "52",
            "route": "4",
            "run": "2"
          }
        ],
        "8": [
          {
            "minute": "22",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "52",
            "route": "4",
            "run": "2"
          }
        ],
        "9": [
          {
            "minute": "27",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "02",
            "route": "4",
            "run": "2"
          }
        ],
        "10": [
          {
            "minute": "37",
            "route": "4",
            "run": "1"
          }
        ],
        "11": [
          {
            "minute": "12",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "47",
            "route": "4",
            "run": "1"
          }
        ],
        "12": [
          {
            "minute": "22",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "57",
            "route": "4",
            "run": "1"
          }
        ],
        "13": [
          {
            "minute": "32",
            "route": "4",
            "run": "2"
          }
        ],
        "14": [
          {
            "minute": "07",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "42",
            "route": "4",
            "run": "2"
          }
        ],
        "15": [
          {
            "minute": "17",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "52",
            "route": "4",
            "run": "2"
          }
        ],
        "16": [
          {
            "minute": "27",
            "route": "4",
            "run": "1"
          },
          {
            "minute": "02",
            "route": "4",
            "run": "2"
          }
        ],
        "17": [
          {
            "minute": "37",
            "route": "4",
            "run": "1"
          }
        ],
        "18": [
          {
            "minute": "12",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "47",
            "route": "4",
            "run": "1"
          }
        ],
        "19": [
          {
            "minute": "22",
            "route": "4",
            "run": "2"
          },
          {
            "minute": "57",
            "route": "4",
            "run": "1"
          }
        ],
        "20": [
          {
            "minute": "32",
            "route": "4",
            "run": "2"
          }
        ]
      }
    }
  }
};
