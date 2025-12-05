/**
 * UIManager: 화면 렌더링
 */
const UIManager = {
    renderEmpSection(name, key, rows, currentTab, showWeekends = {}) {
        const sectionId = `${name}_${key}`.replace(/[\s:]+/g, '-');

        let titleHtml = "";
        if (currentTab === 'monthly') {
            titleHtml = `📅 ${key} 월`;
        } else {
            const sDate = new Date(key);
            const eDate = TimeUtils.getSunday(sDate);
            const sStr = `${sDate.getMonth() + 1}.${sDate.getDate()}`;
            const eStr = `${eDate.getMonth() + 1}.${eDate.getDate()}`;
            titleHtml = `🗓️ ${sStr} ~ ${eStr} 주간`;
        }

        const showDashboard = currentTab === 'weekly' ? '' : 'hidden';

        // 주간 모드일 때 월~금 전체 날짜 생성
        let tableRows = '';
        if (currentTab === 'weekly') {
            const weekdayDates = TimeUtils.getWeekdayDates(key);
            const weekendDates = TimeUtils.getWeekendDates(key);
            const rowMap = {};
            rows.forEach(row => {
                rowMap[row.근무일자] = row;
            });

            // 월~금 행 생성
            weekdayDates.forEach(dateStr => {
                const row = rowMap[dateStr] || { 근무일자: dateStr, 출근시간: '', 퇴근시간: '', 외출시간: '' };
                tableRows += this.generateRowHtml(row, false);
            });

            // 주말 행
            const weekendKey = `${name}_${key}`;
            weekendDates.forEach(dateStr => {
                const row = rowMap[dateStr];
                if (row || (showWeekends[weekendKey] && showWeekends[weekendKey].includes(dateStr))) {
                    const weekendRow = row || { 근무일자: dateStr, 출근시간: '', 퇴근시간: '', 외출시간: '' };
                    tableRows += this.generateRowHtml(weekendRow, true);
                }
            });
        } else {
            rows.forEach(row => {
                tableRows += this.generateRowHtml(row, false);
            });
        }

        // 주말 추가 버튼
        const weekendBtnHtml = currentTab === 'weekly' ? `
            <button onclick="App.toggleWeekend('${name}', '${key}')" class="add-weekend-btn w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 mt-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                주말(토/일) 추가
            </button>
        ` : '';

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

                    <div id="dashboard-${sectionId}" class="${showDashboard} grid grid-cols-1 md:grid-cols-3 gap-4">
                        ${this.renderTargetCard(sectionId)}
                        ${this.renderFridayCard(sectionId)}
                        ${this.renderRewardCard(sectionId)}
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
                            ${tableRows}
                        </tbody>
                    </table>
                    <div class="px-3 pb-3">
                        ${weekendBtnHtml}
                    </div>
                </div>
            </div>
        `;
    },

    renderTargetCard(sectionId) {
        return `
            <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div class="flex justify-between items-end mb-2">
                    <p class="text-sm font-bold text-slate-700">⏳ 목표 달성 현황 (<span id="target-disp-${sectionId}">${CONFIG.DEFAULT_TARGET}</span>h)</p>
                    <p id="rem-hours-text-${sectionId}" class="text-xs font-bold text-indigo-600">-</p>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-3 overflow-hidden">
                    <div id="progress-${sectionId}" class="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style="width: 0%"></div>
                </div>
                <div class="flex justify-between items-center text-xs text-slate-600">
                    <div class="flex items-center gap-1">
                        <span>남은 평일 <b id="rem-days-${sectionId}">0</b>일</span>
                        <div class="flex gap-0.5 ml-1">
                            <button onclick="App.adjustDays('${sectionId}', -1)" class="w-4 h-4 bg-white border rounded hover:bg-slate-100 leading-none">-</button>
                            <button onclick="App.adjustDays('${sectionId}', 1)" class="w-4 h-4 bg-white border rounded hover:bg-slate-100 leading-none">+</button>
                        </div>
                    </div>
                    <div class="text-right">
                        하루 <span id="daily-target-${sectionId}" class="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">0h</span> 권장
                        <div id="exit-estimate-${sectionId}" class="text-[10px] text-slate-400 mt-0.5"></div>
                    </div>
                </div>
            </div>
        `;
    },

    renderFridayCard(sectionId) {
        return `
            <div class="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-lg">🏁</span>
                    <p class="text-sm font-bold text-emerald-800">금요일 퇴근 예측</p>
                </div>
                <div class="text-xs text-emerald-700 space-y-1">
                    <div class="flex justify-between">
                        <span>남은 시간:</span>
                        <span id="friday-remain-${sectionId}" class="font-bold">-</span>
                    </div>
                    <div class="w-full h-px bg-emerald-200 my-1"></div>
                    <div id="friday-estimate-${sectionId}" class="space-y-1">
                        <div class="flex justify-between items-center">
                            <span>09:00 출근 시:</span>
                            <span class="font-bold text-emerald-900">-</span>
                        </div>
                    </div>
                    <p id="friday-tip-${sectionId}" class="text-[10px] text-emerald-500 mt-2 pt-1 border-t border-emerald-200"></p>
                </div>
            </div>
        `;
    },

    renderRewardCard(sectionId) {
        return `
            <div class="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-lg">🎁</span>
                    <p class="text-sm font-bold text-indigo-800">보상 휴가 (${CONFIG.REWARD_MULTIPLIER}배)</p>
                </div>
                <div class="text-xs text-indigo-700 space-y-1">
                    <div class="flex justify-between">
                        <span>현재 초과:</span>
                        <span id="reward-overtime-${sectionId}" class="font-bold">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span>보상휴가 (×${CONFIG.REWARD_MULTIPLIER}):</span>
                        <span id="reward-hours-${sectionId}" class="font-bold">-</span>
                    </div>
                    <div class="w-full h-px bg-indigo-200 my-1"></div>
                    <div id="reward-breakdown-${sectionId}" class="bg-indigo-100 rounded p-2 text-indigo-800">
                        <p class="font-bold text-xs mb-1">휴가 환산:</p>
                        <p id="reward-detail-${sectionId}" class="text-xs">-</p>
                    </div>
                    <div class="w-full h-px bg-indigo-200 my-1"></div>
                    <div class="flex justify-between items-center">
                        <span>목표 달성 시:</span>
                        <span id="reward-proj-${sectionId}" class="font-bold text-indigo-900">-</span>
                    </div>
                    <p class="text-[10px] text-right text-indigo-400 mt-1">* 연차=${CONFIG.LEAVE_UNITS.ANNUAL}h, 반차=${CONFIG.LEAVE_UNITS.HALF}h, 반반차=${CONFIG.LEAVE_UNITS.QUARTER}h</p>
                </div>
            </div>
        `;
    },

    generateRowHtml(row, isWeekendRow = false) {
        const date = new Date(row.근무일자);
        const dayName = CONFIG.DAY_NAMES[date.getDay()];
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday = TimeUtils.isToday(row.근무일자);
        const isFuture = TimeUtils.isFuture(row.근무일자);

        const dateClass = isWeekend ? "text-red-500" : "text-slate-700";
        const inTime = TimeUtils.cleanTimeStr(row.출근시간);
        const outTime = TimeUtils.cleanTimeStr(row.퇴근시간);
        const leaveTime = TimeUtils.cleanTimeStr(row.외출시간);

        // 행 클래스 결정
        let rowClasses = "hover:bg-slate-50 transition-colors data-row";
        if (isToday) rowClasses += " today-row";
        else if (isFuture) rowClasses += " future-row";
        if (isWeekend || isWeekendRow) rowClasses += " weekend-row";

        const todayBadge = isToday ? '<span class="today-badge">오늘</span>' : '';
        const futureIcon = isFuture && !isWeekend ? '<span class="text-slate-400 text-[10px] ml-1">(예정)</span>' : '';

        return `
            <tr class="${rowClasses}" data-date="${row.근무일자}">
                <td class="p-3 whitespace-nowrap">
                    <div class="font-medium ${dateClass} date-cell">${row.근무일자}(${dayName})${todayBadge}${futureIcon}</div>
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
        const maxH = CONFIG.MAX_DISPLAY_HOURS;
        const standardH = CONFIG.STANDARD_HOURS;
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
