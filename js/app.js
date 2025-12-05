/**
 * App: 애플리케이션 로직
 */
const App = {
    state: {
        rawData: [],
        groupedData: { weekly: {}, monthly: {} },
        currentTab: 'weekly',
        holidays: new Set(),
        adjustments: {},
        showWeekends: {}
    },

    // 디바운스 타이머
    debounceTimer: null,

    init() {
        // 로컬 저장 데이터 복원
        this.loadFromStorage();

        // 기본 이벤트
        document.getElementById('csvUploader').addEventListener('change', this.handleFileUpload.bind(this));
        document.getElementById('tab-weekly').onclick = () => this.switchTab('weekly');
        document.getElementById('tab-monthly').onclick = () => this.switchTab('monthly');
        document.getElementById('btn-apply-settings').onclick = () => {
            this.saveSettingsToStorage();
            this.calculateAll();
        };
        document.getElementById('target-hours').addEventListener('change', () => {
            this.saveSettingsToStorage();
            this.calculateAll();
        });

        // 이벤트 위임: 결과 컨테이너에서 모든 입력 이벤트 처리
        this.setupEventDelegation();

        window.App = this;

        // 저장된 데이터가 있으면 렌더링
        if (this.state.rawData.length > 0) {
            document.getElementById('placeholder').style.display = 'none';
            this.processData();
            this.render();
        }
    },

    /**
     * 이벤트 위임 설정
     */
    setupEventDelegation() {
        const container = document.getElementById('results-container');

        // change 이벤트 (select, 시간 입력 완료)
        container.addEventListener('change', (e) => {
            if (e.target.matches('.time-input, .leave-hours-input, .leave-selector')) {
                this.debouncedCalculate();
                this.saveDataToStorage();
            }
        });

        // input 이벤트 (실시간 입력)
        container.addEventListener('input', (e) => {
            if (e.target.matches('.time-input, .leave-hours-input')) {
                this.debouncedCalculate();
            }
        });

        // blur 이벤트 (시간 자동 포맷)
        container.addEventListener('blur', (e) => {
            if (e.target.matches('.time-input')) {
                const formatted = TimeUtils.autoFormatTime(e.target.value);
                if (formatted && formatted !== e.target.value) {
                    e.target.value = formatted;
                    this.debouncedCalculate();
                    this.saveDataToStorage();
                }
            }
        }, true); // capture phase로 blur 감지
    },

    /**
     * 디바운스된 계산
     */
    debouncedCalculate() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.calculateAll();
        }, CONFIG.DEBOUNCE_DELAY);
    },

    /**
     * 로컬 스토리지에서 데이터 복원
     */
    loadFromStorage() {
        try {
            // 설정 복원
            const settings = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
            if (settings) {
                const parsed = JSON.parse(settings);
                if (parsed.targetHours) {
                    document.getElementById('target-hours').value = parsed.targetHours;
                }
                if (parsed.coreStart) {
                    document.getElementById('core-start').value = parsed.coreStart;
                }
                if (parsed.coreEnd) {
                    document.getElementById('core-end').value = parsed.coreEnd;
                }
            }

            // 조정값 복원
            const adjustments = localStorage.getItem(CONFIG.STORAGE_KEYS.ADJUSTMENTS);
            if (adjustments) {
                this.state.adjustments = JSON.parse(adjustments);
            }

            // 주말 표시 복원
            const weekends = localStorage.getItem(CONFIG.STORAGE_KEYS.WEEKENDS);
            if (weekends) {
                this.state.showWeekends = JSON.parse(weekends);
            }

            // 데이터 복원
            const data = localStorage.getItem(CONFIG.STORAGE_KEYS.DATA);
            if (data) {
                this.state.rawData = JSON.parse(data);
            }
        } catch (e) {
            console.warn('로컬 스토리지 복원 실패:', e);
        }
    },

    /**
     * 설정을 로컬 스토리지에 저장
     */
    saveSettingsToStorage() {
        try {
            const settings = {
                targetHours: document.getElementById('target-hours').value,
                coreStart: document.getElementById('core-start').value,
                coreEnd: document.getElementById('core-end').value
            };
            localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.warn('설정 저장 실패:', e);
        }
    },

    /**
     * 데이터를 로컬 스토리지에 저장
     */
    saveDataToStorage() {
        try {
            // 현재 DOM에서 수정된 데이터 수집
            const updatedData = this.collectCurrentData();
            localStorage.setItem(CONFIG.STORAGE_KEYS.DATA, JSON.stringify(updatedData));
            localStorage.setItem(CONFIG.STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(this.state.adjustments));
            localStorage.setItem(CONFIG.STORAGE_KEYS.WEEKENDS, JSON.stringify(this.state.showWeekends));
        } catch (e) {
            console.warn('데이터 저장 실패:', e);
        }
    },

    /**
     * 현재 DOM에서 수정된 데이터 수집
     */
    collectCurrentData() {
        const data = [];
        const sections = document.querySelectorAll('.section-container');

        sections.forEach(sec => {
            const name = sec.dataset.name;
            const rows = sec.querySelectorAll('.data-row');

            rows.forEach(tr => {
                const dateStr = tr.dataset.date;
                const clockIn = tr.querySelector('.clock-in').value;
                const clockOut = tr.querySelector('.clock-out').value;
                const leaveHours = tr.querySelector('.leave-hours-input').value;
                const leaveType = tr.querySelector('.leave-selector').value;

                // 빈 행은 저장하지 않음 (출근 시간이 있는 경우만)
                if (clockIn || clockOut) {
                    data.push({
                        이름: name,
                        근무일자: dateStr,
                        출근시간: clockIn,
                        퇴근시간: clockOut,
                        외출시간: leaveHours,
                        휴가유형: leaveType
                    });
                }
            });
        });

        return data;
    },

    /**
     * 로컬 스토리지 초기화
     */
    clearStorage() {
        Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        this.state = {
            rawData: [],
            groupedData: { weekly: {}, monthly: {} },
            currentTab: 'weekly',
            holidays: new Set(),
            adjustments: {},
            showWeekends: {}
        };
        location.reload();
    },

    switchTab(tab) {
        this.state.currentTab = tab;
        document.getElementById('tab-weekly').className = `tab-btn ${tab === 'weekly' ? 'active' : ''}`;
        document.getElementById('tab-monthly').className = `tab-btn ${tab === 'monthly' ? 'active' : ''}`;
        if (this.state.rawData.length) this.render();
    },

    adjustDays(sectionId, val) {
        this.state.adjustments[sectionId] = (this.state.adjustments[sectionId] || 0) + val;
        this.saveDataToStorage();
        this.calculateAll();
    },

    toggleWeekend(name, weekKey) {
        const key = `${name}_${weekKey}`;
        const weekendDates = TimeUtils.getWeekendDates(weekKey);

        if (this.state.showWeekends[key]) {
            delete this.state.showWeekends[key];
        } else {
            this.state.showWeekends[key] = weekendDates;
        }
        this.saveDataToStorage();
        this.render();
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
                this.saveDataToStorage();
                await this.fetchHolidays();
                this.processData();
                this.render();
            } catch (err) {
                alert("오류: " + err.message);
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

    async fetchHolidays() { /* 공휴일 API 연동 가능 */ },

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
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    },

    render() {
        const container = document.getElementById('results-container');
        container.innerHTML = '';
        const { groupedData, currentTab, showWeekends } = this.state;
        const dataMap = groupedData[currentTab];

        Object.keys(dataMap).sort().forEach(name => {
            const userGroup = document.createElement('div');
            userGroup.className = "space-y-6 mb-12";
            userGroup.innerHTML = `<h2 class="text-2xl font-bold text-slate-800 border-b pb-2 mb-4">${name} 님</h2>`;
            const keys = Object.keys(dataMap[name]).sort().reverse();
            keys.forEach(key => {
                const rows = dataMap[name][key];
                rows.sort((a, b) => (a.근무일자 > b.근무일자) ? 1 : -1);
                userGroup.innerHTML += UIManager.renderEmpSection(name, key, rows, currentTab, showWeekends);
            });
            container.appendChild(userGroup);
        });

        // 이벤트 위임으로 대체되어 개별 리스너 불필요
        this.calculateAll();
    },

    calculateAll() {
        const sections = document.querySelectorAll('.section-container');
        const coreStart = document.getElementById('core-start').value;
        const targetHoursInput = parseFloat(document.getElementById('target-hours').value) || CONFIG.DEFAULT_TARGET;

        sections.forEach(sec => {
            const sectionId = sec.id.replace('section-', '');
            const sectionKey = sec.dataset.key;
            const tbody = sec.querySelector('tbody');
            const rows = tbody.querySelectorAll('.data-row');

            let totalHours = 0;
            let totalHoursExcludingToday = 0; // 오늘 제외 근무시간 (금요일 퇴근 예측용)
            let lastWorkedDateStr = null;
            const workedDates = new Set();
            let todayHours = 0;
            let hasTodayClockIn = false;
            let todayClockInTime = null;
            let todayHasClockOut = false; // 오늘 퇴근 입력 여부

            rows.forEach(tr => {
                const dateStr = tr.dataset.date;
                const isToday = TimeUtils.isToday(dateStr);

                const inStr = tr.querySelector('.clock-in').value;
                const outStr = tr.querySelector('.clock-out').value;
                const leaveH = TimeUtils.timeToHours(tr.querySelector('.leave-hours-input').value);
                const type = tr.querySelector('.leave-selector').value;

                const inDate = TimeUtils.parseSmartTime(inStr, dateStr);
                let outDate = TimeUtils.parseSmartTime(outStr, dateStr);
                if (inDate && outDate && outDate < inDate) outDate.setDate(outDate.getDate() + 1);

                let dayHours = 0;
                if (inDate) {
                    workedDates.add(dateStr);
                    lastWorkedDateStr = dateStr;
                    if (outDate) {
                        dayHours = TimeUtils.calcDuration(inDate, outDate);
                    } else {
                        dayHours = TimeUtils.calcDuration(inDate, new Date());
                    }

                    if (isToday) {
                        hasTodayClockIn = true;
                        todayClockInTime = inDate;
                        todayHasClockOut = !!outDate;
                    }
                }

                dayHours = Math.max(0, dayHours - leaveH);
                if (type === 'annual') dayHours = 8;
                else if (type === 'half') dayHours += 4;
                else if (type === 'quarter') dayHours += 2;

                UIManager.updateRowVisuals(tr, dayHours);

                const coreMsg = tr.querySelector('.core-msg');
                const dateCell = tr.querySelector('.date-cell');
                if (type === 'normal' && inDate) {
                    const cS = TimeUtils.parseSmartTime(coreStart, dateStr);
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

                if (isToday) {
                    todayHours = dayHours;
                } else {
                    totalHoursExcludingToday += dayHours;
                }
                totalHours += dayHours;
            });

            // 1. 총 근무시간
            document.getElementById(`total-${sectionId}`).innerText = TimeUtils.fmtH(totalHours);

            // 2. 52시간 경고
            const warnBox = document.getElementById(`warning-52h-${sectionId}`);
            if (totalHours >= CONFIG.MAX_WEEKLY_HOURS) warnBox.classList.remove('hidden');
            else warnBox.classList.add('hidden');

            // 3. 주간 대시보드
            if (this.state.currentTab === 'weekly') {
                this.updateWeeklyDashboard(sectionId, sectionKey, totalHours, totalHoursExcludingToday, targetHoursInput, workedDates, todayHours, hasTodayClockIn, todayClockInTime, todayHasClockOut);
            }
        });
    },

    updateWeeklyDashboard(sectionId, sectionKey, totalHours, totalHoursExcludingToday, targetHoursInput, workedDates, todayHours, hasTodayClockIn, todayClockInTime, todayHasClockOut) {
        const dashBox = document.getElementById(`dashboard-${sectionId}`);
        if (!dashBox) return;

        dashBox.classList.remove('hidden');
        document.getElementById(`target-disp-${sectionId}`).innerText = targetHoursInput;

        // (A) 목표 달성 및 1/N
        const hoursLeft = Math.max(0, targetHoursInput - totalHours);
        const progressPct = Math.min(100, (totalHours / targetHoursInput) * 100);

        const remText = document.getElementById(`rem-hours-text-${sectionId}`);
        const pBar = document.getElementById(`progress-${sectionId}`);

        if (hoursLeft > 0) {
            remText.innerText = `${TimeUtils.fmtH(hoursLeft)} 남음`;
            pBar.classList.remove('bg-green-500', 'bg-red-500');
            pBar.classList.add('bg-indigo-600');
        } else {
            const over = totalHours - targetHoursInput;
            remText.innerText = `목표 달성! (+${TimeUtils.fmtH(over)})`;
            pBar.classList.remove('bg-indigo-600');
            pBar.classList.add('bg-green-500');
        }
        pBar.style.width = `${progressPct}%`;

        // 남은 평일 계산
        const today = new Date();
        const todayStr = TimeUtils.formatDate(today);
        const friday = TimeUtils.getFriday(new Date(sectionKey));
        const fridayStr = TimeUtils.formatDate(friday);

        let remAuto = 0;
        const weekdayDates = TimeUtils.getWeekdayDates(sectionKey);
        weekdayDates.forEach(dateStr => {
            if (dateStr >= todayStr && dateStr <= fridayStr) {
                if (!workedDates.has(dateStr) || dateStr === todayStr) {
                    if (dateStr === todayStr && hasTodayClockIn) {
                        // 오늘 이미 출근한 경우 제외
                    } else {
                        remAuto++;
                    }
                }
            }
        });

        const adj = this.state.adjustments[sectionId] || 0;
        const finalRemDays = Math.max(0, remAuto + adj);

        document.getElementById(`rem-days-${sectionId}`).innerText = finalRemDays;
        const dailyTargetEl = document.getElementById(`daily-target-${sectionId}`);
        const exitEstEl = document.getElementById(`exit-estimate-${sectionId}`);

        if (finalRemDays > 0 && hoursLeft > 0) {
            const perDay = hoursLeft / finalRemDays;
            dailyTargetEl.innerText = TimeUtils.fmtH_short(perDay);
            const dummy = new Date();
            dummy.setHours(9, 0, 0, 0);
            exitEstEl.innerText = `(09:00 출근 시 ${TimeUtils.addTime(dummy, perDay)} 퇴근)`;
        } else {
            dailyTargetEl.innerText = "0h";
            exitEstEl.innerText = hoursLeft <= 0 ? "목표 달성 완료" : "일정 부족";
        }

        // (B) 금요일 퇴근 예측 - 오늘 제외 근무시간 기준
        this.updateFridayEstimate(sectionId, sectionKey, totalHoursExcludingToday, targetHoursInput, hasTodayClockIn, todayClockInTime, todayHasClockOut);

        // (C) 보상 휴가 시뮬레이션
        this.updateRewardLeave(sectionId, totalHours, targetHoursInput);
    },

    updateFridayEstimate(sectionId, sectionKey, totalHoursExcludingToday, targetHoursInput, hasTodayClockIn, todayClockInTime, todayHasClockOut) {
        const fridayRemainEl = document.getElementById(`friday-remain-${sectionId}`);
        const fridayEstEl = document.getElementById(`friday-estimate-${sectionId}`);
        const fridayTipEl = document.getElementById(`friday-tip-${sectionId}`);

        const today = new Date();
        const todayStr = TimeUtils.formatDate(today);
        const friday = TimeUtils.getFriday(new Date(sectionKey));
        const fridayStr = TimeUtils.formatDate(friday);

        const todayDayOfWeek = today.getDay();
        const isThisWeek = todayStr >= sectionKey && todayStr <= fridayStr;

        // 금요일에 필요한 근무시간 = 목표 - 오늘 제외 근무시간
        const hoursNeededOnFriday = Math.max(0, targetHoursInput - totalHoursExcludingToday);

        fridayRemainEl.innerText = TimeUtils.fmtH(hoursNeededOnFriday);

        if (hoursNeededOnFriday <= 0) {
            fridayEstEl.innerHTML = `<div class="text-emerald-900 font-bold text-center py-2">🎉 이미 목표 달성!</div>`;
            fridayTipEl.innerText = '';
        } else if (!isThisWeek) {
            fridayEstEl.innerHTML = `<div class="text-slate-500 text-center py-2">지난 주 데이터입니다</div>`;
            fridayTipEl.innerText = '';
        } else if (todayDayOfWeek === 5) {
            // 오늘이 금요일
            let estimateHtml = '';

            if (hasTodayClockIn && todayClockInTime && !todayHasClockOut) {
                // 출근했고 아직 퇴근 안 함 - 실제 출근 시간 기준 표시
                const actualStartH = todayClockInTime.getHours();
                const actualStartM = todayClockInTime.getMinutes();
                const exitTime = TimeUtils.addTime(todayClockInTime, hoursNeededOnFriday);
                
                estimateHtml = `
                    <div class="flex justify-between items-center bg-emerald-100 -mx-1 px-1 py-1 rounded">
                        <span>오늘 출근:</span>
                        <span class="font-bold text-emerald-900">${String(actualStartH).padStart(2, '0')}:${String(actualStartM).padStart(2, '0')}</span>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <span>퇴근 예상:</span>
                        <span class="font-bold text-lg text-emerald-900">${exitTime}</span>
                    </div>
                `;
                fridayTipEl.innerText = `* 오늘 ${TimeUtils.fmtH(hoursNeededOnFriday)} 근무 필요`;
            } else if (hasTodayClockIn && todayHasClockOut) {
                // 출근하고 퇴근도 함
                fridayEstEl.innerHTML = `<div class="text-emerald-900 font-bold text-center py-2">✅ 오늘 근무 완료</div>`;
                fridayTipEl.innerText = '';
                return;
            } else {
                // 아직 출근 안 함 - 예상 시간 표시
                [9, 10].forEach(startH => {
                    const startTime = new Date();
                    startTime.setHours(startH, 0, 0, 0);
                    const exitTime = TimeUtils.addTime(startTime, hoursNeededOnFriday);
                    estimateHtml += `
                        <div class="flex justify-between items-center">
                            <span>${String(startH).padStart(2, '0')}:00 출근 시:</span>
                            <span class="font-bold text-emerald-900">${exitTime} 퇴근</span>
                        </div>
                    `;
                });
                fridayTipEl.innerText = `* 오늘 ${TimeUtils.fmtH(hoursNeededOnFriday)} 근무 필요`;
            }

            fridayEstEl.innerHTML = estimateHtml;
        } else {
            // 금요일 전 (월~목)
            const daysUntilFri = 5 - todayDayOfWeek;
            const perDayIfSpread = hoursNeededOnFriday / Math.max(1, daysUntilFri);

            let estimateHtml = '';
            [9, 10].forEach(startH => {
                const startTime = new Date();
                startTime.setHours(startH, 0, 0, 0);
                const exitTime = TimeUtils.addTime(startTime, hoursNeededOnFriday);
                estimateHtml += `
                    <div class="flex justify-between items-center">
                        <span>${String(startH).padStart(2, '0')}:00 출근 시:</span>
                        <span class="font-bold text-emerald-900">${exitTime} 퇴근</span>
                    </div>
                `;
            });
            fridayEstEl.innerHTML = estimateHtml;
            fridayTipEl.innerText = `💡 분산 시(${daysUntilFri}일): 하루 ${TimeUtils.fmtH_short(perDayIfSpread)}`;
        }
    },

    /**
     * 보상 휴가 업데이트 (연차/반차/반반차 분해)
     */
    updateRewardLeave(sectionId, totalHours, targetHoursInput) {
        // 현재 초과 근무 시간
        const overtime = Math.max(0, totalHours - CONFIG.DEFAULT_TARGET);
        
        // 보상 휴가 시간 (1.5배)
        const rewardHours = overtime * CONFIG.REWARD_MULTIPLIER;
        
        // 휴가 분해
        const decomposed = TimeUtils.decomposeLeaveHours(rewardHours);
        const detailText = TimeUtils.formatDecomposedLeave(decomposed);

        // DOM 업데이트
        const overtimeEl = document.getElementById(`reward-overtime-${sectionId}`);
        const hoursEl = document.getElementById(`reward-hours-${sectionId}`);
        const detailEl = document.getElementById(`reward-detail-${sectionId}`);
        const projEl = document.getElementById(`reward-proj-${sectionId}`);

        if (overtimeEl) {
            overtimeEl.innerText = overtime > 0 ? `${overtime.toFixed(1)}시간` : '없음';
        }
        if (hoursEl) {
            hoursEl.innerText = rewardHours > 0 ? `${rewardHours.toFixed(1)}시간` : '없음';
        }
        if (detailEl) {
            detailEl.innerText = detailText;
        }

        // 목표 달성 시 예상
        const projectedTotal = Math.max(totalHours, targetHoursInput);
        const projOvertime = Math.max(0, projectedTotal - CONFIG.DEFAULT_TARGET);
        const projRewardHours = projOvertime * CONFIG.REWARD_MULTIPLIER;
        const projDecomposed = TimeUtils.decomposeLeaveHours(projRewardHours);
        const projDetailText = TimeUtils.formatDecomposedLeave(projDecomposed);

        if (projEl) {
            projEl.innerText = projRewardHours > 0 ? projDetailText : '발생 안함';
        }
    }
};

/**
 * 모달 토글
 */
function toggleModal() {
    const body = document.querySelector('body');
    const modal = document.querySelector('.modal');
    modal.classList.toggle('opacity-0');
    modal.classList.toggle('pointer-events-none');
    body.classList.toggle('modal-active');
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
