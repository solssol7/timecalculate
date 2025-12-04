/**
 * 1. TimeUtils: 시간 계산 및 포맷팅 관련 순수 함수들
 */
const TimeUtils = {
    cleanTimeStr(str) {
        if (!str) return '';
        str = str.trim();
        if (str.includes(' ')) {
            const parts = str.split(' ');
            const timePart = parts.find(p => p.includes(':'));
            return timePart ? timePart.substring(0, 5) : ''; 
        }
        return str.includes(':') ? str.substring(0, 5) : str;
    },

    parseSmartTime(timeStr, baseDateStr) {
        if (!timeStr || timeStr === '-' || timeStr === '') return null;
        const cleanTime = this.cleanTimeStr(timeStr); 
        if (!cleanTime.includes(':')) return null;

        const [h, m] = cleanTime.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return null;

        const dt = baseDateStr ? new Date(baseDateStr) : new Date();
        dt.setHours(h, m, 0, 0);
        return dt;
    },

    calcDuration(startObj, endObj) {
        if (!startObj || !endObj) return 0;
        let diffMs = endObj - startObj;
        if (diffMs < 0) return 0;

        // [점심시간 정책] 11:30 ~ 12:30 (1시간)
        const lunchStart = new Date(startObj); lunchStart.setHours(11, 30, 0, 0);
        const lunchEnd = new Date(startObj); lunchEnd.setHours(12, 30, 0, 0);

        const overlapStart = new Date(Math.max(startObj, lunchStart));
        const overlapEnd = new Date(Math.min(endObj, lunchEnd));
        const deduction = (overlapEnd > overlapStart) ? (overlapEnd - overlapStart) : 0;

        return (diffMs - deduction) / 3600000; 
    },

    timeToHours(str) {
        if (!str || str === '-') return 0;
        const [h, m] = str.split(':').map(Number);
        return isNaN(h) ? 0 : h + (isNaN(m) ? 0 : m / 60);
    },

    fmtH(n) {
        if (isNaN(n)) return "0h 0m";
        const h = Math.floor(n);
        const m = Math.round((n - h) * 60);
        return `${h}시간 ${m}분`;
    },
    
    fmtH_short(n) {
        const h = Math.floor(n); 
        const m = Math.round((n - h) * 60);
        return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    },

    getMonday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },
    
    getSunday(d) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? 0 : 7);
        return new Date(d.setDate(diff));
    },

    calcWorkingDays(startStr, endStr, holidays) {
        let start = new Date(startStr);
        const end = new Date(endStr);
        let count = 0;
        while (start <= end) {
            const d = start.getDay();
            const ymd = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
            // 월~금(1~5) 이고 공휴일이 아니면 카운트
            if (d >= 1 && d <= 5 && !holidays.has(ymd)) {
                count++;
            }
            start.setDate(start.getDate() + 1);
        }
        return count;
    }
};

/**
 * 2. UIManager: 화면 렌더링 관련 로직
 */
const UIManager = {
    renderEmpSection(name, key, rows, currentTab) {
        const sectionId = `${name}_${key}`.replace(/[\s:]+/g, '-');
        
        let titleHtml = "";
        if (currentTab === 'monthly') {
            titleHtml = `📅 ${key} 월`;
        } else {
            const sDate = new Date(key);
            const eDate = TimeUtils.getSunday(sDate);
            const sStr = `${sDate.getMonth()+1}.${sDate.getDate()}`;
            const eStr = `${eDate.getMonth()+1}.${eDate.getDate()}`;
            titleHtml = `🗓️ ${sStr} ~ ${eStr} 주간`;
        }

        return `
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm section-container" id="section-${sectionId}" data-key="${key}" data-name="${name}">
                <div class="bg-white p-5 border-b border-slate-100 flex flex-col gap-4">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-bold text-slate-700 flex items-center">
                            ${titleHtml}
                            <span class="ml-2 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">데이터 ${rows.length}건</span>
                        </h3>
                        <div class="text-right">
                            <p class="text-slate-400 text-xs mb-1">총 근무시간</p>
                            <p id="total-${sectionId}" class="font-bold text-2xl text-slate-800 tracking-tight">-</p>
                        </div>
                    </div>
                    
                    <div id="warning-52h-${sectionId}" class="hidden rounded-lg p-3 bg-red-50 border border-red-100 flex items-center gap-3">
                        <span class="text-2xl">🚨</span>
                        <div><p class="text-sm font-bold text-red-700">주 52시간 초과 주의</p></div>
                    </div>

                    <div id="smart-calc-${sectionId}" class="hidden bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-2">
                                <span class="text-xl">⚖️</span>
                                <div>
                                    <p class="text-sm font-bold text-indigo-800">1/N 스마트 분배</p>
                                    <p class="text-xs text-indigo-600">남은 평일 <span id="rem-days-${sectionId}" class="font-bold">0</span>일, 하루 <span id="daily-target-${sectionId}" class="font-bold bg-white px-1 rounded">0h</span>씩</p>
                                </div>
                            </div>
                            <div class="flex gap-1">
                                <button onclick="App.adjustDays('${sectionId}', -1)" class="w-6 h-6 bg-white border rounded text-indigo-600 font-bold hover:bg-indigo-50">-</button>
                                <button onclick="App.adjustDays('${sectionId}', 1)" class="w-6 h-6 bg-white border rounded text-indigo-600 font-bold hover:bg-indigo-50">+</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-slate-600">
                        <thead class="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th class="p-3 w-32 whitespace-nowrap">날짜</th>
                                <th class="p-3 w-24">출근</th>
                                <th class="p-3 w-24">퇴근</th>
                                <th class="p-3 w-16 text-center">외출</th>
                                <th class="p-3 w-28">유형</th>
                                <th class="p-3">근무강도</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100" id="tbody-${sectionId}">
                            ${rows.map(row => this.generateRowHtml(row)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    generateRowHtml(row) {
        const date = new Date(row.근무일자);
        const dayName = ['일','월','화','수','목','금','토'][date.getDay()];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const dateClass = isWeekend ? "text-red-500" : "text-slate-700";

        const inTime = TimeUtils.cleanTimeStr(row.출근시간);
        const outTime = TimeUtils.cleanTimeStr(row.퇴근시간);
        const leaveTime = TimeUtils.cleanTimeStr(row.외출시간);

        return `
            <tr class="hover:bg-slate-50 transition-colors data-row">
                <td class="p-3 whitespace-nowrap">
                    <div class="font-medium ${dateClass} date-cell">${row.근무일자}(${dayName})</div>
                    <div class="text-[10px] text-red-500 hidden core-msg">⚠️ 코어타임</div>
                </td>
                <td class="p-3"><input type="text" class="time-input clock-in" value="${inTime}" placeholder="09:00"></td>
                <td class="p-3"><input type="text" class="time-input clock-out" value="${outTime}" placeholder="18:00"></td>
                <td class="p-3 text-center"><input type="text" class="leave-hours-input leave-hours" value="${leaveTime}" placeholder="-"></td>
                <td class="p-3">
                    <select class="leave-selector w-full border-slate-200 rounded text-xs py-1.5">
                        <option value="normal">정상</option>
                        <option value="annual">연차(8h)</option>
                        <option value="half">반차(4h)</option>
                        <option value="quarter">반반차(2h)</option>
                    </select>
                </td>
                <td class="p-3 align-middle">
                    <div class="vis-bar-bg w-full max-w-[100px] h-1.5 relative">
                        <div class="vis-bar-fill w-0"></div>
                        <div class="vis-bar-over w-0"></div>
                    </div>
                    <span class="vis-text text-[10px] text-slate-400 ml-1">-</span>
                </td>
            </tr>
        `;
    },

    updateRowVisuals(tr, hours) {
        const fill = tr.querySelector('.vis-bar-fill');
        const over = tr.querySelector('.vis-bar-over');
        const text = tr.querySelector('.vis-text');
        
        const maxH = 12;
        const standardH = 8;
        
        const stdPct = Math.min(100, (Math.min(hours, standardH) / maxH) * 100);
        fill.style.width = `${stdPct}%`;

        if (hours > standardH) {
            const overH = hours - standardH;
            const overPct = (overH / maxH) * 100;
            over.style.width = `${overPct}%`;
            over.style.left = `${stdPct}%`; 
        } else {
            over.style.width = '0%';
        }
        
        text.innerText = hours > 0 ? TimeUtils.fmtH_short(hours) : '-';
    }
};

/**
 * 3. App: 애플리케이션 상태 및 로직 제어
 */
const App = {
    API_KEY: "b060c24914cc86079258cce70c2f5ed20157eea835b61224c687501034d7a6b6",
    state: {
        rawData: [],
        groupedData: { weekly: {}, monthly: {} },
        currentTab: 'weekly',
        holidays: new Set(),
        adjustments: {}
    },

    init() {
        const uploader = document.getElementById('csvUploader');
        if(uploader) {
            uploader.addEventListener('change', this.handleFileUpload.bind(this));
        }
        
        const tabWeekly = document.getElementById('tab-weekly');
        if(tabWeekly) tabWeekly.onclick = () => this.switchTab('weekly');
        
        const tabMonthly = document.getElementById('tab-monthly');
        if(tabMonthly) tabMonthly.onclick = () => this.switchTab('monthly');
        
        const btnApplyCore = document.getElementById('btn-apply-core');
        if(btnApplyCore) btnApplyCore.onclick = () => this.calculateAll();

        window.App = this;
    },

    switchTab(tab) {
        this.state.currentTab = tab;
        document.getElementById('tab-weekly').className = `tab-btn ${tab === 'weekly' ? 'active' : ''}`;
        document.getElementById('tab-monthly').className = `tab-btn ${tab === 'monthly' ? 'active' : ''}`;
        if (this.state.rawData.length) this.render();
    },

    adjustDays(sectionId, val) {
        this.state.adjustments[sectionId] = (this.state.adjustments[sectionId] || 0) + val;
        this.calculateAll();
    },

    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('placeholder').style.display = 'none';
        document.getElementById('loading-spinner').classList.remove('hidden');

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                this.state.rawData = this.parseCSV(evt.target.result);
                await this.fetchHolidays(this.state.rawData);
                this.processData();
                this.render();
            } catch (err) {
                alert("데이터 처리 중 오류: " + err.message);
            } finally {
                document.getElementById('loading-spinner').classList.add('hidden');
            }
        };
        reader.readAsText(file, "UTF-8");
    },

    parseCSV(text) {
        const lines = text.split(/\r?\n/).filter(x => x.trim());
        if (lines.length < 2) throw new Error("유효한 CSV가 아닙니다.");
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const vals = line.split(',');
            const obj = {};
            headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
            return obj;
        });
    },

    async fetchHolidays(data) {
        // 필요시 API 연동 코드 추가
    },

    processData() {
        const { rawData, groupedData } = this.state;
        groupedData.weekly = {};
        groupedData.monthly = {};

        rawData.forEach(row => {
            if (!row.이름 || !row.근무일자) return;
            const name = row.이름;
            
            const mKey = row.근무일자.substring(0, 7);
            if (!groupedData.monthly[name]) groupedData.monthly[name] = {};
            if (!groupedData.monthly[name][mKey]) groupedData.monthly[name][mKey] = [];
            groupedData.monthly[name][mKey].push(row);

            const wKey = this.getWeekKey(row.근무일자);
            if (!groupedData.weekly[name]) groupedData.weekly[name] = {};
            if (!groupedData.weekly[name][wKey]) groupedData.weekly[name][wKey] = [];
            groupedData.weekly[name][wKey].push(row);
        });
    },

    getWeekKey(dateStr) {
        const date = new Date(dateStr);
        const monday = TimeUtils.getMonday(date);
        return `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
    },

    render() {
        const container = document.getElementById('results-container');
        container.innerHTML = '';
        const { groupedData, currentTab } = this.state;
        const dataMap = groupedData[currentTab];
        
        Object.keys(dataMap).sort().forEach(name => {
            const userGroup = document.createElement('div');
            userGroup.className = "space-y-6 mb-12";
            userGroup.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">${name} 님</h2>`;
            
            const keys = Object.keys(dataMap[name]).sort().reverse();
            keys.forEach(key => {
                const rows = dataMap[name][key];
                rows.sort((a,b) => (a.근무일자 > b.근무일자) ? 1 : -1);
                userGroup.innerHTML += UIManager.renderEmpSection(name, key, rows, currentTab);
            });
            container.appendChild(userGroup);
        });

        document.querySelectorAll('.time-input, .leave-hours-input, .leave-selector').forEach(el => {
            el.addEventListener('change', () => this.calculateAll());
        });

        this.calculateAll();
    },

    calculateAll() {
        const sections = document.querySelectorAll('.section-container');
        const coreStart = document.getElementById('core-start').value;
        const coreEnd = document.getElementById('core-end').value;

        sections.forEach(sec => {
            const sectionId = sec.id.replace('section-', '');
            const sectionKey = sec.dataset.key;
            const tbody = sec.querySelector('tbody');
            const rows = tbody.querySelectorAll('.data-row');
            
            let totalHours = 0;
            let lastWorkedDateStr = null;
            const workedDates = new Set();

            rows.forEach(tr => {
                const dateText = tr.querySelector('.date-cell').innerText.split('(')[0];
                workedDates.add(dateText);
                lastWorkedDateStr = dateText;

                const inStr = tr.querySelector('.clock-in').value;
                const outStr = tr.querySelector('.clock-out').value;
                const leaveH = TimeUtils.timeToHours(tr.querySelector('.leave-hours-input').value);
                const type = tr.querySelector('.leave-selector').value;

                const inDate = TimeUtils.parseSmartTime(inStr, dateText);
                let outDate = TimeUtils.parseSmartTime(outStr, dateText);

                if (inDate && outDate && outDate < inDate) {
                    outDate.setDate(outDate.getDate() + 1);
                }

                let dayHours = 0;
                if (inDate) {
                    if (outDate) dayHours = TimeUtils.calcDuration(inDate, outDate);
                    else dayHours = TimeUtils.calcDuration(inDate, new Date());
                }

                dayHours = Math.max(0, dayHours - leaveH);
                if (type === 'annual') dayHours = 8;
                else if (type === 'half') dayHours += 4;
                else if (type === 'quarter') dayHours += 2;

                UIManager.updateRowVisuals(tr, dayHours);
                
                const coreMsg = tr.querySelector('.core-msg');
                const dateCell = tr.querySelector('.date-cell');
                if (type === 'normal' && inDate) {
                    const cS = TimeUtils.parseSmartTime(coreStart, dateText);
                    const cE = TimeUtils.parseSmartTime(coreEnd, dateText); // 종료시간도 체크 가능
                    if (inDate > cS) {
                        coreMsg.classList.remove('hidden');
                        dateCell.classList.add('core-violation');
                    } else {
                        coreMsg.classList.add('hidden');
                        dateCell.classList.remove('core-violation');
                    }
                } else {
                    coreMsg.classList.add('hidden');
                    dateCell.classList.remove('core-violation');
                }

                totalHours += dayHours;
            });

            document.getElementById(`total-${sectionId}`).innerText = TimeUtils.fmtH(totalHours);
            
            const warnBox = document.getElementById(`warning-52h-${sectionId}`);
            if (totalHours >= 52) warnBox.classList.remove('hidden');
            else warnBox.classList.add('hidden');

            const smartBox = document.getElementById(`smart-calc-${sectionId}`);
            if (this.state.currentTab === 'weekly' && lastWorkedDateStr) {
                const start = new Date(lastWorkedDateStr);
                start.setDate(start.getDate() + 1);
                const endStr = new Date(sectionKey); 
                endStr.setDate(endStr.getDate() + 6);

                const remAuto = TimeUtils.calcWorkingDays(start, endStr, this.state.holidays);
                const adj = this.state.adjustments[sectionId] || 0;
                const finalRemDays = Math.max(0, remAuto + adj);

                if (finalRemDays > 0) {
                    smartBox.classList.remove('hidden');
                    document.getElementById(`rem-days-${sectionId}`).innerText = finalRemDays;
                    
                    const needed = Math.max(0, 40 - totalHours);
                    const perDay = needed / finalRemDays;
                    document.getElementById(`daily-target-${sectionId}`).innerText = TimeUtils.fmtH(perDay);
                } else {
                    smartBox.classList.add('hidden');
                }
            } else {
                smartBox.classList.add('hidden');
            }
        });
    }
};

// 모달 제어 함수
function toggleModal() {
    const body = document.querySelector('body');
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.classList.toggle('opacity-0');
        modal.classList.toggle('pointer-events-none');
        body.classList.toggle('modal-active');
    }
}

// 앱 실행
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
